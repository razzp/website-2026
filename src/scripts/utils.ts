import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import type * as THREE from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import type { pageRoutes } from '../config/runtime';
import type { PageMeta, PageTheme } from '../lib/config';
import type { HeroBackground, HeroForeground } from './components/heroes';
import type { State } from './layouts/DefaultLayout';

function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function expoInWithInitialVelocity(
    velocity: number,
    acceleration: number = 8,
): (position: number) => number {
    return (position: number) =>
        velocity * position +
        ((1 - velocity) * (Math.exp(acceleration * position) - 1)) /
            (Math.exp(acceleration) - 1);
}

function getCameraOffsetY(
    containerRect: DOMRect,
    placeholderRect: DOMRect,
): number {
    const heightDiff = containerRect.height / 2 - placeholderRect.height / 2;
    const offsetDiff = placeholderRect.top - containerRect.top;

    return heightDiff - offsetDiff;
}

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

async function loadThreeJsFont(): Promise<Font> {
    const path = './fonts/StackSansText-Regular-subset.ttf';

    const [{ Font }, fontData] = await Promise.all([
        import('three/addons/loaders/FontLoader.js'),
        import('three/addons/loaders/TTFLoader.js').then(({ TTFLoader }) =>
            new TTFLoader().loadAsync(path),
        ),
    ]);

    return new Font(fontData);
}

function mapNormalisedToRange(value: number, from: number, to: number): number {
    return from + value * (to - from);
}

function mouseEventOnly(callback: (event: PointerEvent) => void) {
    return (event: PointerEvent) => {
        if (event.pointerType === 'mouse') {
            callback(event);
        }
    };
}

function pixelsToWorldUnits(
    value: number,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
) {
    const visibleHeight =
        2 * camera.position.z * Math.tan(degreesToRadians(camera.fov * 0.5));

    const worldUnitsPerPixel = visibleHeight / renderer.domElement.height;

    return value * worldUnitsPerPixel;
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

    heroForeground.applyTheme(pageMeta.theme);
    heroBackground.applyTheme(pageMeta.theme);

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

export {
    degreesToRadians,
    expoInWithInitialVelocity,
    getCameraOffsetY,
    getPageMeta,
    getScrollbarWidth,
    getThemeVarsAsStyles,
    isSpecialClick,
    loadThreeJsFont,
    mapNormalisedToRange,
    mouseEventOnly,
    pixelsToWorldUnits,
    preloadModulesWhenIdle,
    restoreScrollPosition,
    swapPage,
};
