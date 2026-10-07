import type { default as LenisInstance } from 'lenis';
import { find, findAll, findOrThrow, getScrollbarWidth } from 'spank-my-dom';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { type PageModule, pageRoutes, type Route } from '../../config/runtime';
import { FooterPixels } from '../components/FooterPixels';
import { getRotationVectors } from '../components/heroes';
import {
    getPageMeta,
    getScrollPaddingTop,
    isRoute,
    isSpecialClick,
    loadThreeJsFont,
    preloadModulesWhenIdle,
    restoreScrollPosition,
    swapPage,
} from '../utils';

declare global {
    interface DocumentEventMap {
        'app:page-request': CustomEvent<string>;
    }
}

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
    loadPage: (route: Route, anchor?: string) => Promise<void>;
}

const pageMeta = getPageMeta(document);
const pageRoute = pageRoutes[pageMeta.route];

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
    loadPage: (route: Route, anchor?: string) => loadPage(route, anchor),
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

// Cache the scrollbar width.

document.documentElement.style.setProperty(
    '--scrollbar-width',
    `${getScrollbarWidth()}px`,
);

// Create the hero components.

const heroPlaceholder = findOrThrow<HTMLElement>('#hero-placeholder');

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

// Resize heroes to fit their allocated placeholders.

heroForeground.resize();
heroBackground.resize();

gsap.ticker.add(() => {
    const vectors = getRotationVectors(state);

    heroBackground.rotate(...vectors);
    heroForeground.rotate(...vectors);

    if (state.headerVisible) {
        heroForeground.render();

        if (state.heroBackgroundVisible) {
            heroBackground.render();
        }
    }
});

// Create the footer pixels.

const footerPixels = new FooterPixels(
    findOrThrow<HTMLCanvasElement>('#footer-pixels'),
);

// Set up the nav.

const loadPage = async (route: Route, anchor?: string): Promise<void> => {
    const pageRoute = pageRoutes[route];

    const [html, newPageJs] = await Promise.all([
        fetch(route).then((response) => response.text()),
        pageRoute.loadJs(),
        transitionOut({
            state,
            heroBackground,
            onBeforeHide: () => {
                state.pageJs?.destroy(state);
            },
        }),
    ]);

    state.pageJs = newPageJs;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageMeta = getPageMeta(doc);

    history.pushState({}, '', route);

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
            footerPixels.setColour(pageMeta.theme.primaryContrast);
        },
    });

    if (anchor) {
        const { enableTransitions, lenis } = state;

        const anchorElement = find<HTMLElement>(
            `#${anchor.startsWith('#') ? anchor.slice(1) : anchor}`,
        );

        if (anchorElement) {
            // Ensure Lenis is up to date.
            lenis.resize();

            lenis.scrollTo(anchorElement, {
                duration: 0.8,
                immediate: !enableTransitions,
                lock: true,
                offset: -getScrollPaddingTop(anchorElement),
                easing: gsap.parseEase('expo.inOut'),
            });
        }
    }
};

findAll<HTMLAnchorElement>('a[data-link-swap]').forEach((link) => {
    link.addEventListener('click', async (event) => {
        if (isSpecialClick(event)) return;

        event.preventDefault();

        const { pathname } = new URL(link.href);

        if (isRoute(pathname)) {
            await loadPage(pathname);
        } else {
            location.href = link.href;
        }
    });
});

// Good to go. Begin the first transition!

transitionIn({
    state,
    heroBackground,
    heroForeground,
    onBeforeShow: async () => {
        document.body.dataset.page = pageRoute.cssScope;
        pageJs.init(state);
    },
    onAfterShow: () => {
        footerPixels.setColour(pageMeta.theme.primaryContrast);
        restoreScrollPosition(state);
    },
});

preloadModulesWhenIdle(pageRoutes);

// Save scroll position when the page is unloaded.
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPosition', `${window.scrollY}`);
});

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

export type { State };
