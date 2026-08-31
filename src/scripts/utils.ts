import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import type { pageRoutes } from '../config/runtime';
import type { PageMeta, PageTheme } from '../lib/config';
import type { HeroBackground, HeroForeground } from './components/heroes';
import type { State } from './layouts/DefaultLayout';

function getPageMeta(source: Document): PageMeta {
    return JSON.parse(findOrThrow('#page-meta', source).textContent);
}

function getScrollbarWidth(): number {
    const tempElement = document.createElement('div');

    tempElement.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 100px;
        height: 100px;
        overflow: scroll;
    `;

    document.body.appendChild(tempElement);

    const width = tempElement.offsetWidth - tempElement.clientWidth;

    tempElement.remove();

    return width;
}

function getThemeVarsAsStyles(theme: PageTheme): string[] {
    return Object.entries(theme).map(
        ([key, value]) =>
            `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`,
    );
}

function isSpecialClick(event: PointerEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function preloadModulesWhenIdle(routes: typeof pageRoutes): void {
    const connection = navigator.connection;

    // Don't preload on slow or metered connections.
    if (
        connection?.saveData ||
        connection?.effectiveType === 'slow-2g' ||
        connection?.effectiveType === '2g'
    ) {
        return;
    }

    const preload = () => {
        for (const { loadJs } of Object.values(routes)) {
            void loadJs().catch(() => {});
        }
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(preload, { timeout: 5000 });
    } else {
        setTimeout(preload, 1000);
    }
}

function restoreScrollPosition(state: State): void {
    const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;

    if (navigation?.type === 'reload') {
        const { enableTransitions, lenis } = state;
        const savedScrollY = sessionStorage.getItem('scrollPosition');

        if (savedScrollY !== null) {
            // Ensure Lenis is up to date, as this is likely being called
            // very early on in the page's lifecycle.
            lenis.resize();

            lenis.scrollTo(parseFloat(savedScrollY), {
                duration: 0.6,
                immediate: !enableTransitions,
                easing: gsap.parseEase('expo.inOut'),
            });
        }
    }
}

async function swapPage(options: {
    state: State;
    pageMeta: PageMeta;
    doc: Document;
    heroBackground: HeroBackground;
    heroForeground: HeroForeground;
}): Promise<void> {
    const { state, pageMeta, doc, heroBackground, heroForeground } = options;

    document.title = pageMeta.title;

    findOrThrow('#page-meta').innerHTML = JSON.stringify(pageMeta);
    findOrThrow('#hero-strapline').innerHTML = pageMeta.strapline;

    findOrThrow('meta[name="theme-color"]').setAttribute(
        'content',
        pageMeta.theme.primary,
    );

    findAll('[data-swap]').forEach((element) => {
        const id = element.dataset.swap;
        const newElement = doc.querySelector(`[data-swap="${id}"]`);

        if (newElement) {
            element.replaceWith(newElement);
        }
    });

    heroBackground.setText(pageMeta.heading);
    heroForeground.setText(pageMeta.heading);

    heroBackground.resize();
    heroForeground.resize();

    heroForeground.setColour(pageMeta.theme.meshFace);
    heroBackground.setColour(pageMeta.theme.primaryContrast);

    for (const [key, value] of Object.entries(pageMeta.theme)) {
        // Ignore 'primary' as we'll animate it later...
        if (state.enableTransitions && key === 'primary') continue;

        document.documentElement.style.setProperty(
            `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
            value,
        );
    }

    if (state.enableTransitions) {
        const colourTween = document.documentElement.animate(
            {
                '--theme-primary': pageMeta.theme.primary,
            },
            {
                duration: 600,
                fill: 'forwards',
                easing: 'ease',
            },
        );

        await colourTween.finished;
    }
}

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

export {
    getPageMeta,
    getScrollbarWidth,
    getThemeVarsAsStyles,
    isSpecialClick,
    preloadModulesWhenIdle,
    restoreScrollPosition,
    swapPage,
    triggerMouseHint,
};
