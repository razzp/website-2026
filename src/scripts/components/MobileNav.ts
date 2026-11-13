import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';

const NAV_MARGIN = 50;

const doc = document.documentElement;

class MobileNav {
    private readonly mainNav: HTMLElement;
    private readonly openButton: HTMLElement;
    private readonly dialog: HTMLDialogElement;
    private readonly dialogInner: Element;
    private readonly dialogHeading: Element;
    private readonly elementsToFade: Element[];

    private readonly props = {
        blur: 0,
        opacity: 0,
    };

    public isOpen = false;

    constructor() {
        this.mainNav = findOrThrow<HTMLElement>('.js-main-nav');
        this.openButton = findOrThrow('.js-mob-nav-open');

        const dialog = findOrThrow<HTMLDialogElement>('.js-mob-nav-dialog');

        this.dialog = dialog;
        this.dialogInner = findOrThrow('.js-dialog-inner', dialog);
        this.dialogHeading = findOrThrow('.js-dialog-heading', dialog);
        this.elementsToFade = findAll('.js-fade', dialog);

        this.openButton.addEventListener('click', () => this.open());

        findOrThrow('.js-mob-nav-close').addEventListener('click', () =>
            this.close(),
        );

        this.dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            this.close();
        });
    }

    private applyProps(): void {
        // This MUST be on :root (see stylesheet).
        doc.style.setProperty('--mob-nav-bg-opacity', `${this.props.opacity}`);
        this.dialog.style.setProperty('--bd-blur', `${this.props.blur}px`);
    }

    private getPaddingDiff(): number {
        const dialogHeadingStyles = getComputedStyle(this.dialogHeading);
        const buttonStyles = getComputedStyle(this.openButton);

        return (
            parseFloat(dialogHeadingStyles.paddingBlock) -
            parseFloat(buttonStyles.paddingBlock)
        );
    }

    public open(): void {
        this.isOpen = true;
        this.dialog.showModal();

        this.dialog.style.opacity = '0';
        this.mainNav.style.opacity = '1';

        const buttonRect = this.openButton.getBoundingClientRect();
        const dialogInnerRect = this.dialogInner.getBoundingClientRect();

        gsap.timeline({
            defaults: {
                duration: 0.6,
                ease: 'expo.inOut',
            },
            onStart: () => {
                this.dialog.style.opacity = '1';
                this.mainNav.style.opacity = '0';
            },
            onUpdate: () => this.applyProps(),
        })
            .fromTo(
                this.props,
                {
                    blur: 0,
                    opacity: 0.5,
                },
                {
                    blur: 50,
                    opacity: 1,
                },
                0,
            )
            .fromTo(
                this.dialog,
                {
                    x: buttonRect.x,
                    y: buttonRect.y,
                    width: buttonRect.width,
                    height: buttonRect.height,
                    borderRadius: buttonRect.height / 2,
                },
                {
                    x: NAV_MARGIN,
                    y: NAV_MARGIN,
                    width: doc.clientWidth - NAV_MARGIN * 2,
                    height: dialogInnerRect.height,
                    borderRadius: 0,
                },
                0,
            )
            .from(
                this.dialogHeading,
                {
                    y: -this.getPaddingDiff(),
                },
                0,
            )
            .to(
                this.dialogHeading,
                {
                    opacity: 0.5,
                },
                0,
            )
            .fromTo(
                this.elementsToFade,
                {
                    opacity: 0,
                },
                {
                    opacity: 1,
                    stagger: 0.02,
                },
                0.1,
            );
    }

    public async close(fast = false): Promise<void> {
        this.isOpen = false;

        const buttonRect = this.openButton.getBoundingClientRect();

        await gsap
            .timeline({
                defaults: {
                    duration: 0.6,
                    ease: 'expo.inOut',
                },
                onUpdate: () => this.applyProps(),
                onComplete: () => {
                    this.dialog.close();
                    this.mainNav.style.opacity = '1';
                    gsap.set(this.dialogHeading, { clearProps: 'all' });
                },
            })
            .to(
                this.props,
                {
                    blur: 0,
                    opacity: 0.5,
                },
                0,
            )
            .to(
                this.dialog,
                {
                    x: buttonRect.x,
                    y: buttonRect.y,
                    width: buttonRect.width,
                    height: buttonRect.height,
                    borderRadius: buttonRect.height / 2,
                },
                0,
            )
            .to(
                this.dialogHeading,
                {
                    y: -this.getPaddingDiff(),
                    opacity: 1,
                },
                0,
            )
            .to(
                this.elementsToFade,
                {
                    opacity: 0,
                },
                0,
            )
            .timeScale(fast ? 1.2 : 1);
    }
}

export { MobileNav };
