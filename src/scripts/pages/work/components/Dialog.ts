import { gsap } from 'gsap';
import Lenis from 'lenis';
import { findOrThrow } from 'spank-my-dom';

class Dialog {
    constructor(private readonly element: HTMLDialogElement) {}

    private createAnimation(
        closeButton: HTMLElement,
        logo: HTMLImageElement,
        logoRect: DOMRect,
    ): gsap.core.Timeline {
        const dialogLogo = findOrThrow('.js-dialog-logo', this.element);
        const dialogLogoRect = dialogLogo.getBoundingClientRect();
        const dialogBody = findOrThrow('.js-dialog-body', this.element);

        const animation = gsap
            .timeline()
            .set(logo, { opacity: 0 })
            .fromTo(
                this.element,
                {
                    '--blur': '0px',
                    '--brightness': 1,
                },
                {
                    '--blur': '10px',
                    '--brightness': 0.6,
                    duration: 1,
                    ease: 'power2.inOut',
                },
            )
            .fromTo(
                this.element,
                {
                    '--rotation': '10%',
                },
                {
                    '--rotation': '0%',
                    duration: 1,
                    ease: 'expo.inOut',
                },
                '<+0.4',
            )
            .from(
                dialogLogo,
                {
                    x: logoRect.x - dialogLogoRect.x,
                    y: logoRect.y - dialogLogoRect.y,
                    scale: logoRect.width / dialogLogoRect.width,
                    duration: 1,
                    ease: 'expo.inOut',
                },
                '<+0.2',
            )
            .from(
                [dialogBody, closeButton],
                {
                    opacity: 0,
                    filter: 'blur(10px)',
                    duration: 1,
                    ease: 'expo.inOut',
                },
                '>-0.6',
            )
            .pause();

        return animation;
    }

    public setContent(template: HTMLTemplateElement): void {
        this.element.replaceChildren(template.content.cloneNode(true));
    }

    public async open(options: {
        onAfterClosed: () => void;
        logo: HTMLImageElement;
        backgroundColour: string;
        textColour: string;
    }): Promise<void> {
        const { onAfterClosed, logo, backgroundColour, textColour } = options;
        const closeButton = findOrThrow('.js-dialog-close', this.element);
        const dialogContent = findOrThrow('.js-dialog-content');

        this.element.showModal();

        const logoRect = logo.getBoundingClientRect();
        const { x, y, width, height } = logoRect;
        const animation = this.createAnimation(closeButton, logo, logoRect);

        // Set theme colours.

        this.element.style.setProperty('--bg-colour', backgroundColour);
        this.element.style.setProperty('--text-colour', textColour);

        // Position the radial gradient over the logo.

        this.element.style.setProperty('--x', `${x + width / 2}px`);
        this.element.style.setProperty('--y', `${y + height / 2}px`);

        // Create a temporary Lenis instance scoped to the dialog.

        const dialogLenis = new Lenis({
            wrapper: this.element,
            content: dialogContent,
            autoRaf: true,
        });

        dialogLenis.stop();

        const controller = new AbortController();

        controller.signal.addEventListener(
            'abort',
            async () => {
                if (!dialogLenis.isStopped) {
                    await new Promise((resolve) => {
                        dialogLenis.scrollTo(0, {
                            duration: 0.6,
                            lock: true,
                            easing: gsap.parseEase('expo.inOut'),
                            onComplete: resolve,
                        });
                    });
                }

                this.element.classList.remove('-interactive');
                dialogLenis.destroy();

                await animation.timeScale(1.2).reverse();

                this.element.close();
                animation.kill();
                this.element.replaceChildren();

                onAfterClosed();
            },
            { once: true },
        );

        this.element.addEventListener(
            'cancel',
            (event) => {
                event.preventDefault();
                controller.abort();
            },
            { signal: controller.signal },
        );

        closeButton.addEventListener(
            'click',
            () => {
                controller.abort();
            },
            { signal: controller.signal },
        );

        animation.eventCallback('onComplete', () => {
            dialogLenis.start();
            this.element.classList.add('-interactive');
        });

        animation.play();
    }
}

export { Dialog };
