import { findOrThrow } from 'spank-my-dom';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { pageRoutes } from '../../config/runtime';
import { getPageMeta } from '../utils';

const STORAGE_KEY = 'probablyCached';
const MIN_WAIT_MS = 1000;
const FONT_PATH = './fonts/StackSansText-Regular-subset.ttf';

const pageMeta = getPageMeta(document);
const pageRoute = pageRoutes[pageMeta.route];

const probablyCached = sessionStorage.getItem(STORAGE_KEY);

const promises = Promise.all([
    import('./DefaultLayout'),
    loadThreeJsFont(),
    pageRoute.loadModule(),
    document.fonts.ready,
]);

const preloader = findOrThrow<HTMLElement>('.js-preloader');

// Set preloader text dynamically so that
// it's announced by screen readers.
preloader.innerText = 'loading';

let preloaderAnimation: Animation | undefined;

if (!probablyCached) {
    document.documentElement.classList.add('-show-preloader');

    preloaderAnimation = preloader.animate(
        [
            { letterSpacing: '0.25ch', opacity: 1 },
            { letterSpacing: '50px', opacity: 0.5 },
        ],
        {
            duration: MIN_WAIT_MS * 2,
            fill: 'forwards',
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
    );

    await new Promise((resolve) => window.setTimeout(resolve, MIN_WAIT_MS));
}

const [{ init }, threeJsFont, pageModule] = await promises;

if (!probablyCached) {
    const computed = getComputedStyle(preloader);
    const currentLetterSpacing = computed.letterSpacing;
    const currentOpacity = computed.opacity;

    preloaderAnimation?.cancel();

    await preloader.animate(
        [
            { letterSpacing: currentLetterSpacing, opacity: currentOpacity },
            { letterSpacing: '0.25ch', opacity: 1 },
        ],
        {
            duration: 400,
            fill: 'forwards',
            easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
        },
    ).finished;

    await preloader.animate(
        [
            { filter: 'blur(0px)', opacity: 1 },
            { filter: 'blur(10px)', opacity: 0 },
        ],
        {
            duration: 400,
            endDelay: 200,
            fill: 'forwards',
            easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
        },
    ).finished;

    document.documentElement.classList.remove('-show-preloader');
}

await init({ threeJsFont, pageMeta, pageModule, pageRoute });

sessionStorage.setItem(STORAGE_KEY, 'true');

async function loadThreeJsFont(): Promise<Font> {
    const [{ Font }, fontData] = await Promise.all([
        import('three/addons/loaders/FontLoader.js'),
        import('three/addons/loaders/TTFLoader.js').then(({ TTFLoader }) =>
            new TTFLoader().loadAsync(FONT_PATH),
        ),
    ]);

    return new Font(fontData);
}
