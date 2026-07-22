import { findOrThrow } from 'spank-my-dom';
import type { Page } from '../../lib/config';

interface Options {
    pushState?: boolean;
    whileLoading?: () => Promise<void>;
}

function getPageConfig(doc: Document): Page {
    const config = findOrThrow('#config', doc);

    return JSON.parse(config.textContent);
}

async function loadPage(url: string, options?: Options): Promise<Page> {
    const { pushState = true, whileLoading } = { ...options };

    const [html] = await Promise.allSettled([
        fetch(url).then((response) => response.text()),
        whileLoading?.() ?? Promise.resolve(),
    ]);

    if (html.status === 'rejected') {
        throw new Error(html.reason);
    }

    const doc = new DOMParser().parseFromString(html.value, 'text/html');
    const config = getPageConfig(doc);

    swapPage(doc, config);

    if (pushState) {
        history.pushState({}, '', url);
    }

    return config;
}

function swapPage(doc: Document, config: Page): void {
    document.title = config.title;

    findOrThrow('#hero-strapline').innerHTML = config.strapline;

    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', config.theme.primary);

    document.querySelectorAll<HTMLElement>('[data-swap]').forEach((element) => {
        const id = element.dataset.swap;
        const newElement = doc.querySelector(`[data-swap="${id}"]`);

        if (newElement) {
            element.replaceWith(newElement);
        }
    });
}

export { getPageConfig, loadPage };
