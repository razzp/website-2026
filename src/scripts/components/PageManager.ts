import type { Theme } from '../../lib/config';

class PageManager {
    #isBusy = false;

    private readonly transitionIn: () => Promise<void>;
    private readonly transitionOut: () => Promise<void>;

    constructor(options: {
        transitionIn: () => Promise<void>;
        transitionOut: () => Promise<void>;
    }) {
        this.transitionIn = options.transitionIn;
        this.transitionOut = options.transitionOut;
    }

    private async _loadPage(
        url: string,
        options: { push?: boolean } = {},
    ): Promise<void> {
        const { push = true } = options;

        if (this.isBusy) return;

        this.#isBusy = true;

        const [html] = await Promise.allSettled([
            fetch(url).then((response) => response.text()),
            this.transitionOut(),
        ]);

        if (html.status === 'rejected') {
            throw new Error(html.reason);
        }

        swapPage(new DOMParser().parseFromString(html.value, 'text/html'));

        if (push) {
            history.pushState({}, '', url);
        }

        await this.transitionIn();

        this.#isBusy = false;
    }

    public async loadPage(
        url: string,
        options: { push?: boolean } = {},
    ): Promise<void> {
        try {
            // Try loading the page.
            await this._loadPage(url, options);
        } catch {
            // If something goes wrong, simply redirect normally.
            location.href = url;
        }
    }

    public get isBusy(): boolean {
        return this.#isBusy;
    }
}

function getTheme(page: Document): Theme {
    const text = page.querySelector('#theme')?.textContent;

    if (!text) {
        throw new Error('Theme data not found.');
    }

    return JSON.parse(text);
}

function swapPage(page: Document): void {
    const theme = getTheme(page);

    document.title = page.title;

    (
        [
            ['--theme-primary', theme.primary],
            ['--theme-primary-contrast', theme.primaryContrast],
        ] as const
    ).forEach(([prop, value]) => {
        document.documentElement.style.setProperty(prop, value);
    });

    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme.primary);

    document.querySelectorAll<HTMLElement>('[data-swap]').forEach((element) => {
        const id = element.dataset.swap;
        const newElement = page.querySelector(`[data-swap="${id}"]`);

        if (newElement) {
            element.replaceWith(newElement);
        }
    });
}

export { PageManager };
