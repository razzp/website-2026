import { gsap } from 'gsap';
import { MotionPathPlugin, ScrollTrigger, SplitText } from 'gsap/all';
import type { default as LenisInstance } from 'lenis';
import Lenis from 'lenis';
import { delegate, findOrThrow, getScrollbarWidth } from 'spank-my-dom';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import {
    type PageModule,
    type PageRoute,
    pageRoutes,
} from '../../config/runtime';
import type { PageMeta } from '../../lib/config';
import { FooterPixels } from '../components/FooterPixels';
import {
    getRotationVectors,
    HeroBackground,
    HeroForeground,
} from '../components/heroes';
import { MobileNav } from '../components/MobileNav';
import { PageManager } from '../components/PageManager';
import { transitionIn } from '../components/transitions';
import {
    isSpecialClick,
    preloadModulesWhenIdle,
    restoreScrollPosition,
} from '../utils';

declare global {
    interface DocumentEventMap {
        'app:page-request-relative': CustomEvent<string>;
    }
}

interface State {
    enableTransitions: boolean;
    interactive: boolean;
    interactiveTimestamp: number;
    headerVisible: boolean;
    heroBackgroundVisible: boolean;
    isProbablyMouse: boolean;
    lenis: LenisInstance;
    threeJsFont: Font;
    mouse: {
        x: number;
        y: number;
    };
}

interface InitOptions {
    threeJsFont: Font;
    pageMeta: PageMeta;
    pageModule: PageModule;
    pageRoute: PageRoute;
}

const header = findOrThrow('.js-main-header');

// Cache the scrollbar width.

document.documentElement.style.setProperty(
    '--scrollbar-width',
    `${getScrollbarWidth()}px`,
);

// Save scroll position when the page is unloaded.
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPosition', `${window.scrollY}`);
});

preloadModulesWhenIdle(pageRoutes);

function init(options: InitOptions): void {
    const { threeJsFont, pageMeta, pageModule, pageRoute } = options;

    // Build a state object that we can pass around.

    const mouseQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    const state: State = {
        enableTransitions: true,
        interactive: false,
        interactiveTimestamp: 0,
        headerVisible: false,
        heroBackgroundVisible: false,
        isProbablyMouse: mouseQuery.matches,
        lenis: new Lenis(),
        threeJsFont,
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

    // Listen for some state stuff...

    new IntersectionObserver(([entry]) => {
        state.headerVisible = entry.isIntersecting;
    }).observe(header);

    window.addEventListener(
        'pointermove',
        (event) => {
            if (event.pointerType !== 'mouse') return;

            state.mouse.x = event.clientX;
            state.mouse.y = event.clientY;
        },
        { passive: true },
    );

    mouseQuery.addEventListener('change', () => {
        state.isProbablyMouse = mouseQuery.matches;
    });

    // Create the hero components.

    const heroPlaceholder = findOrThrow<HTMLElement>('.js-hero-placeholder');

    const heroForeground = new HeroForeground({
        state,
        container: findOrThrow('.js-hero-foreground'),
        placeholder: heroPlaceholder,
        text: pageMeta.heading,
        theme: pageMeta.theme,
    });

    const heroBackground = new HeroBackground({
        state,
        container: findOrThrow('.js-hero-background'),
        placeholder: heroPlaceholder,
        text: pageMeta.heading,
        theme: pageMeta.theme,
    });

    // Resize heroes to fit their allocated placeholders.

    gsap.ticker.add((time) => {
        const vectors = getRotationVectors(
            state,
            time - state.interactiveTimestamp,
        );

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

    const footerPixels = new FooterPixels();

    // Set up page navigation.

    const mobileNav = new MobileNav();

    const pageManager = new PageManager({
        state,
        activeModule: pageModule,
        mobileNav,
        heroBackground,
        heroForeground,
        footerPixels,
    });

    window.addEventListener('popstate', async (event) => {
        const url = event.state?.url;

        if (!url) return;

        await pageManager.loadOrRedirect({ url: new URL(url), push: false });
    });

    document.addEventListener(
        'click',
        delegate<HTMLAnchorElement, PointerEvent>(
            '[data-link-swap]',
            async ({ originalEvent, delegateTarget: link }) => {
                if (isSpecialClick(originalEvent)) return;

                originalEvent.preventDefault();

                await pageManager.loadOrRedirect({ url: new URL(link.href) });
            },
        ),
    );

    document.addEventListener('app:page-request-relative', async (event) => {
        await pageManager.loadOrRedirect({
            url: new URL(event.detail, location.host),
        });
    });

    // Good to go. Begin the first transition!
    requestAnimationFrame(() => {
        transitionIn({
            state,
            heroBackground,
            heroForeground,
            onBeforeShow: async () => {
                document.body.dataset.page = pageRoute.cssScope;
                pageModule.init(state);
            },
            onAfterShow: () => {
                footerPixels.setColour(pageMeta.theme.primaryContrast);
                restoreScrollPosition(state);
            },
            slowFog: true,
        });
    });
}

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

export { init, type State };
