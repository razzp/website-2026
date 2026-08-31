import { assertIsNotUndefined } from 'bossy-boots';
import { gsap } from 'gsap';
import { findOrThrow } from 'spank-my-dom';
import type { PageMeta } from '../../../../lib/config';
import type { State } from '../../../layouts/DefaultLayout';
import type { PageState } from '../types/PageState';
import { createDecorativeFrame } from '../utils';
import type { Dialog } from './Dialog';
import type { Tag } from './Tag';

interface Options {
    state: State;
    pageState: PageState;
    pageMeta: PageMeta;
    dialog: Dialog;
    element: HTMLElement;
    tags: Tag[];
}

class Study {
    private readonly renderDecorativeFrame: () => void;
    private readonly state: State;
    private readonly pageState: PageState;
    private readonly content: HTMLElement;
    private readonly logo: HTMLImageElement;
    private readonly dialog: Dialog;
    private readonly dialogTemplate: HTMLTemplateElement;

    public readonly element: HTMLElement;
    public readonly tags: Tag[];

    constructor(options: Options) {
        const { state, pageState, pageMeta, dialog, element, tags } = options;

        const tagNames = element.dataset.tags?.split('|') ?? [];
        const backgroundColour = element.dataset.backgroundColour;
        const textColour = element.dataset.textColour;

        assertIsNotUndefined(backgroundColour);
        assertIsNotUndefined(textColour);

        this.tags = tagNames
            .map((tag) => tags.find(({ name }) => name.trim() === tag.trim()))
            .filter((tag) => tag !== undefined);

        this.renderDecorativeFrame = createDecorativeFrame(element, [
            textColour,
            pageMeta.theme.primary,
            pageMeta.theme.primaryContrast,
        ]);

        this.state = state;
        this.pageState = pageState;
        this.element = element;
        this.content = findOrThrow('.js-study-content', element);
        this.logo = findOrThrow('.js-study-logo', element);
        this.dialog = dialog;
        this.dialogTemplate = findOrThrow('template', element);

        // Logo parallax effect.

        gsap.timeline({
            scrollTrigger: {
                trigger: element,
                scrub: true,
                start: 'top bottom',
                end: 'bottom top',
            },
            defaults: {
                ease: 'none',
            },
        }).fromTo(
            this.content,
            {
                y: -100,
            },
            {
                y: 100,
            },
        );

        // Dialog.

        findOrThrow('.js-open', element).addEventListener('click', async () => {
            if (this.pageState.inert) return;

            const { lenis } = this.state;

            this.pageState.inert = true;

            await this.scrollToElement();
            lenis.stop();

            this.dialog.setContent(this.dialogTemplate);

            this.dialog.open({
                onAfterClosed: () => {
                    lenis.start();
                    this.pageState.inert = false;
                },
                logo: this.logo,
                backgroundColour,
                textColour,
            });
        });
    }

    private scrollToElement(): Promise<void> {
        return new Promise((resolve) => {
            const { lenis } = this.state;

            lenis.scrollTo(this.element, {
                duration: 0.6,
                lock: true,
                easing: gsap.parseEase('expo.inOut'),
                onComplete: () => resolve(),
            });
        });
    }

    public resize(): void {
        this.renderDecorativeFrame();
    }

    public toggleTags(show: boolean): void {
        this.tags.forEach((tag) => {
            tag.toggle(show);
        });
    }

    public get dialogContent(): Node {
        return this.dialogTemplate.content.cloneNode(true);
    }
}

export { Study };
