import type { default as LenisInstance } from 'lenis';
import { findAll, findOrThrow } from 'spank-my-dom';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import {
    type PageModule,
    pageRoutes,
    type RouteKey,
} from '../../config/runtime';
import { generateFooterPixels } from '../components/footer-pixels';
import { getRotationVectors } from '../components/heroes';
import {
    getPageMeta,
    isSpecialClick,
    loadThreeJsFont,
    preloadModulesWhenIdle,
    restoreScrollPosition,
    swapPage,
} from '../utils';

interface State {
    enableTransitions: boolean;
    interactive: boolean;
    headerVisible: boolean;
    heroBackgroundVisible: boolean;
    lenis: LenisInstance;
    threeJsFont: Font;
    pageJs?: PageModule;
    mouse: {
        x: number;
        y: number;
    };
}

const pageMeta = getPageMeta(document);
const pageRoute = pageRoutes[pageMeta.routeKey];

// Load everything we need to begin.

const [
    { gsap },
    { ScrollTrigger, SplitText, MotionPathPlugin },
    { default: Lenis },
    { HeroBackground, HeroForeground },
    { transitionIn, transitionOut },
    threeJsFont,
    pageJs,
] = await Promise.all([
    import('gsap'),
    import('gsap/all'),
    import('lenis'),
    import('../components/heroes'),
    import('../components/transitions'),
    loadThreeJsFont(),
    pageRoute.loadJs(),
    document.fonts.ready,
]);

const header = findOrThrow('#main-header');
const footerPixels = findOrThrow<HTMLCanvasElement>('#footer-pixels');

// Build a state object that we can pass around.

const state: State = {
    enableTransitions: false,
    interactive: false,
    headerVisible: false,
    heroBackgroundVisible: false,
    lenis: new Lenis(),
    threeJsFont,
    pageJs,
    mouse: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
    },
};

// Configure Lenis.

state.lenis.on('scroll', ({ scroll }) => {
    ScrollTrigger.update();
    triggerMouseHint(scroll);
});

triggerMouseHint(window.scrollY);

// Configure GSAP.

gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);
gsap.ticker.lagSmoothing(0);

gsap.ticker.add((time) => {
    state.lenis.raf(time * 1000);
});

// Listen for some stuff...

new IntersectionObserver(([entry]) => {
    state.headerVisible = entry.isIntersecting;
}).observe(header);

window.addEventListener(
    'mousemove',
    (event) => {
        state.mouse.x = event.clientX;
        state.mouse.y = event.clientY;
    },
    { passive: true },
);

// Create the hero components.

const heroPlaceholder = findOrThrow('#hero-placeholder');
const heroMaxRotation = 0.1;

const heroForeground = new HeroForeground({
    state,
    container: findOrThrow('#hero-foreground'),
    placeholder: heroPlaceholder,
    text: pageMeta.heading,
    theme: pageMeta.theme,
});

const heroBackground = new HeroBackground({
    state,
    container: findOrThrow('#hero-background'),
    placeholder: heroPlaceholder,
    text: pageMeta.heading,
    theme: pageMeta.theme,
});

// Wait for THREE to compile. Probably unnecessary, but it can't hurt.

await Promise.all([heroBackground.compile(), heroForeground.compile()]);

// Resize heroes to fit their allocated placeholders.

heroForeground.resize();
heroBackground.resize();

gsap.ticker.add(() => {
    const vectors = getRotationVectors(state, heroMaxRotation);

    heroBackground.rotate(...vectors);
    heroForeground.rotate(...vectors);

    if (state.headerVisible) {
        heroForeground.render();

        if (state.heroBackgroundVisible) {
            heroBackground.render();
        }
    }
});

// Set up the nav.

findAll<HTMLAnchorElement>('a[data-link-swap]').forEach((link) => {
    link.addEventListener('click', async (event) => {
        if (isSpecialClick(event)) return;

        const routeKey = new URL(link.href).pathname as RouteKey;

        if (!Object.keys(pageRoutes).includes(routeKey)) return;

        event.preventDefault();

        const pageRoute = pageRoutes[routeKey];

        const [html, newPageJs] = await Promise.all([
            fetch(link.href).then((response) => response.text()),
            pageRoute.loadJs(),
            transitionOut({ state, heroBackground }).then(() =>
                state.pageJs?.destroy(state),
            ),
        ]);

        state.pageJs = newPageJs;

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const pageMeta = getPageMeta(doc);

        history.pushState({}, '', link.href);

        await swapPage({
            state,
            pageMeta,
            doc,
            heroBackground,
            heroForeground,
        });

        await transitionIn({
            state,
            heroBackground,
            heroForeground,
            onBeforeShow: () => {
                document.body.dataset.page = pageRoute.cssScope;
                newPageJs.init(state);
            },
            onAfterShow: () => {
                generateFooterPixels(
                    footerPixels,
                    pageMeta.theme.primaryContrast,
                );
            },
        });
    });
});

// Good to go. Begin the first transition!

await transitionIn({
    state,
    heroBackground,
    heroForeground,
    onBeforeShow: async () => {
        document.body.dataset.page = pageRoute.cssScope;
        pageJs.init(state);
    },
    onAfterShow: () => {
        generateFooterPixels(footerPixels, pageMeta.theme.primaryContrast);
        restoreScrollPosition(state);
    },
});

preloadModulesWhenIdle(pageRoutes);

// Save scroll position when the page is unloaded.
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPosition', String(window.scrollY));
});

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

export type { State };
