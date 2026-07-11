class PageManager {
    #isBusy = false;

    readonly #transitionIn: () => Promise<void>;
    readonly #transitionOut: () => Promise<void>;

    constructor(options: {
        transitionIn: () => Promise<void>;
        transitionOut: () => Promise<void>;
    }) {
        this.#transitionIn = options.transitionIn;
        this.#transitionOut = options.transitionOut;
    }

    async #loadPage(
        url: string,
        options: { push?: boolean } = {},
    ): Promise<void> {
        const { push = true } = options;

        if (this.#isBusy) {
            throw new Error('Already loading.');
        }

        this.#isBusy = true;

        const [html] = await Promise.all([
            await fetch(url).then((response) => response.text()),
            this.#transitionOut(),
        ]);

        swapPage(new DOMParser().parseFromString(html, 'text/html'));

        if (push) {
            history.pushState({}, '', url);
        }

        await this.#transitionIn();

        this.#isBusy = false;
    }

    public async loadPage(
        url: string,
        options: { push?: boolean } = {},
    ): Promise<void> {
        try {
            // Try loading the page.
            await this.#loadPage(url, options);
        } catch {
            // If something goes wrong, simply redirect normally.
            location.href = url;
        }
    }

    public get isBusy(): boolean {
        return this.#isBusy;
    }
}

function swapPage(page: Document): void {
    document.title = page.title;

    document.querySelectorAll<HTMLElement>('[data-swap]').forEach((element) => {
        const id = element.dataset.swap;
        const newElement = page.querySelector(`[data-swap="${id}"]`);

        if (newElement) {
            element.replaceWith(newElement);
        }
    });
}

export { PageManager };
