import { gsap } from 'gsap';
import { findOrThrow } from 'spank-my-dom';
import type * as THREE from 'three';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { pageRoutes, type Route } from '../config/runtime';
import type { PageMeta, PageTheme } from '../lib/config';
import type { State } from './layouts/DefaultLayout';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

function defineBreakpoints<T extends { base: unknown }>(
    breakpoints: T & { [K in Breakpoint]?: unknown },
): () => T[keyof T] {
    const { base, '2xl': xxl, xl, lg, md, sm } = breakpoints;

    const gte = (width: number) =>
        window.matchMedia(`(width >= ${width}rem)`).matches;

    return (() => {
        if (xxl !== undefined && gte(96)) return xxl;
        if (xl !== undefined && gte(80)) return xl;
        if (lg !== undefined && gte(64)) return lg;
        if (md !== undefined && gte(48)) return md;
        if (sm !== undefined && gte(40)) return sm;

        return base;
    }) as () => T[keyof T];
}

function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function dispatchPageRequestRelative(path: string): void {
    document.dispatchEvent(
        new CustomEvent('app:page-request-relative', {
            detail: path,
        }),
    );
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

function getScrollPaddingTop(element: Element): number {
    return parseFloat(getComputedStyle(element).scrollPaddingTop) || 0;
}

function getThemeVarsAsStyles(theme: PageTheme): string[] {
    return Object.entries(theme).map(
        ([key, value]) =>
            `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`,
    );
}

function isRoute(input: string): input is Route {
    return Object.keys(pageRoutes).includes(input);
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

function pixelsToWorldUnits(
    value: number,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
) {
    const visibleHeight =
        2 * camera.position.z * Math.tan(degreesToRadians(camera.fov * 0.5));

    const worldUnitsPerPixel = visibleHeight / renderer.domElement.clientHeight;

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
        for (const { loadModule } of Object.values(routes)) {
            void loadModule().catch(() => {});
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
                duration: 0.8,
                immediate: !enableTransitions,
                easing: gsap.parseEase('expo.inOut'),
            });
        }
    }
}

function toggleScrollbar(enabled: boolean): void {
    if (enabled) {
        document.documentElement.classList.remove('-no-scrollbar');
    } else {
        document.documentElement.classList.add('-no-scrollbar');
    }
}

export {
    defineBreakpoints,
    degreesToRadians,
    dispatchPageRequestRelative,
    expoInWithInitialVelocity,
    getCameraOffsetY,
    getPageMeta,
    getScrollPaddingTop,
    getThemeVarsAsStyles,
    isRoute,
    isSpecialClick,
    loadThreeJsFont,
    mapNormalisedToRange,
    pixelsToWorldUnits,
    preloadModulesWhenIdle,
    restoreScrollPosition,
    toggleScrollbar,
};
