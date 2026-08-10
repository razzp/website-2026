import { findAll, findOrThrow } from 'spank-my-dom';
import {
    type PageModule,
    pageRoutes,
    type RouteKey,
} from '../../config/runtime';
import { generateFooterPixels } from '../components/footer-pixels';
import { getRotationVectors } from '../components/Hero';
import {
    getPageMeta,
    isSpecialClick,
    swapPage,
    triggerMouseHint,
} from '../utils';

interface State {
    pageJs?: PageModule;
    enableTransitions: boolean;
    interactive: boolean;
    headerVisible: boolean;
    heroBackgroundVisible: boolean;
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
    { ScrollTrigger, SplitText },
    { default: Lenis },
    { HeroBackground, HeroForeground },
    { transitionIn, transitionOut },
    pageJs,
] = await Promise.all([
    import('gsap'),
    import('gsap/all'),
    import('lenis'),
    import('../components/Hero'),
    import('../components/transitions'),
    pageRoute.loadJs(),
    document.fonts.ready,
]);

const header = findOrThrow('#main-header');
const placeholder = findOrThrow('#hero-placeholder');
const footerPixels = findOrThrow<HTMLCanvasElement>('#footer-pixels');
const maxRotation = 0.1;

// Build a state object that we can pass around.

const state: State = {
    pageJs,
    enableTransitions: true,
    interactive: false,
    headerVisible: false,
    heroBackgroundVisible: false,
    mouse: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
    },
};

// Listen for some stuff...

new IntersectionObserver(
    ([entry]) => {
        state.headerVisible = entry.isIntersecting;
    },
    {
        threshold: 0,
    },
).observe(header);

window.addEventListener(
    'mousemove',
    (event) => {
        state.mouse.x = event.clientX;
        state.mouse.y = event.clientY;
    },
    { passive: true },
);

// Create the hero components.

const heroForeground = new HeroForeground({
    container: findOrThrow('#hero-foreground'),
    placeholder,
    text: pageMeta.heading,
    colour: pageMeta.theme.meshFace,
});

const heroBackground = new HeroBackground({
    container: findOrThrow('#hero-background'),
    placeholder,
    text: pageMeta.heading,
    colour: pageMeta.theme.primaryContrast,
});

// Wait for THREE to compile. Probably unnecessary, but it can't hurt.

await Promise.all([heroBackground.compile(), heroForeground.compile()]);

// Resize heroes to fit their allocated placeholders.

heroForeground.resize();
heroBackground.resize();

// Configure Lenis.

const lenis = new Lenis();

lenis.on('scroll', ({ scroll }) => {
    ScrollTrigger.update();
    triggerMouseHint(scroll);
});

triggerMouseHint(window.scrollY);

// Configure GSAP.

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.ticker.lagSmoothing(0); // Lenis compat.

gsap.ticker.add((time) => {
    // Synchronise with Lenis.
    lenis.raf(time * 1000);

    const vectors = getRotationVectors(state, maxRotation);

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
            transitionOut({ state, heroBackground, lenis }).then(() =>
                state.pageJs?.destroy(),
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
                newPageJs.init();
            },
            onAfterShow: () => {
                newPageJs.initSafe?.();
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
        pageJs.init();
    },
    onAfterShow: () => {
        pageJs.initSafe?.();
        generateFooterPixels(footerPixels, pageMeta.theme.primaryContrast);
    },
});

export type { State };
