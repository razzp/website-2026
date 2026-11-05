import { gsap } from 'gsap';
import { arrayOf, findOrThrow } from 'spank-my-dom';
import type { PageEntitiesHelper } from '../../../../components/PageEntitiesHelper';
import { MaskSegment } from './MaskSegment';

const MASK_SEGMENTS = 4;

abstract class Demo {
    private readonly transition: gsap.core.Timeline;

    protected readonly headingElement: HTMLElement;

    public abstract resize(): void;
    public abstract start(): void;
    public abstract stop(): void;

    constructor(
        protected container: HTMLElement,
        pageEntities: PageEntitiesHelper,
    ) {
        const segments = arrayOf(
            MASK_SEGMENTS,
            (index) => new MaskSegment(this.container, MASK_SEGMENTS, index),
        );

        container.style.setProperty(
            'clip-path',
            `shape(from 0% 100%, ${segments.flatMap((x) => x.commands).join(',')}, close)`,
        );

        const transition = gsap
            .timeline()
            .fromTo(
                segments,
                {
                    progress: 1,
                },
                {
                    progress: 0,
                    stagger: 0.1,
                    duration: 1,
                    ease: 'expo.inOut',
                },
            )
            .pause();

        this.transition = transition;
        pageEntities.addGsapAnimation(transition);

        this.headingElement = findOrThrow('.js-demo-heading', container);
    }

    public async transitionIn(immediate = false): Promise<void> {
        if (immediate) {
            this.transition.progress(1);
            return;
        }

        await this.transition.progress(0).play();
    }

    public async transitionOut(immediate = false): Promise<void> {
        if (immediate) {
            this.transition.progress(0);
            return;
        }

        await this.transition.progress(1).reverse();
    }
}

export { Demo };
