import { gsap } from 'gsap';
import { SplitText } from 'gsap/all';
import { findOrThrow } from 'spank-my-dom';
import type { State } from '../layouts/DefaultLayout';
import { defineBreakpoints } from '../utils';
import type { HeroBackground, HeroForeground } from './heroes';

interface TransitionInOptions {
    state: State;
    heroBackground: HeroBackground;
    heroForeground: HeroForeground;
    slowFog?: boolean;
    onBeforeShow?: () => void;
    onAfterShow?: () => void;
}

interface TransitionOutOptions {
    state: State;
    heroBackground: HeroBackground;
    onBeforeHide?: () => void;
}

const strapline = findOrThrow('.js-hero-strapline');
const wrapper = findOrThrow('main');

const getStretchValue = defineBreakpoints({
    base: '25px',
    lg: '50px',
});

const getTextShiftValue = defineBreakpoints({
    base: 25,
    lg: 40,
});

function getComputed(
    element = document.documentElement,
): (value: string) => string {
    const styles = getComputedStyle(element);

    return (value: string) => styles.getPropertyValue(value).trim();
}

function transitionIn(options: TransitionInOptions): Promise<void> {
    return new Promise((resolve) => {
        const {
            state,
            heroBackground,
            heroForeground,
            slowFog = false,
            onBeforeShow,
            onAfterShow,
        } = options;

        const { enableTransitions } = state;

        (async () => {
            const splitText = SplitText.create(strapline, { type: 'words' });
            const fogProps = heroBackground.getFogProps();
            const computed = getComputed();

            const props = {
                y: 0,
            };

            state.heroBackgroundVisible = true;

            await gsap
                .timeline({
                    onUpdate: () => {
                        heroForeground.setYOffsetInScreenPixels(props.y);
                    },
                })
                .to(heroBackground.scene.fog, {
                    duration: slowFog ? 2 : 1,
                    ease: 'expo.out',
                    far: fogProps.farVisible,
                    near: fogProps.nearVisible,
                })
                .to(
                    wrapper,
                    {
                        duration: 0.8,
                        '--inset-top': computed('--inset-y'),
                        ease: 'expo.in',
                        onComplete: () => {
                            state.heroBackgroundVisible = false;
                            wrapper.style.setProperty(
                                '--inset-top',
                                'var(--inset-y)',
                            );
                        },
                    },
                    '>-0.8',
                )
                .to(wrapper, {
                    duration: 0.4,
                    '--stretch': getStretchValue(),
                    ease: 'expo.out',
                })
                .to(
                    props,
                    {
                        duration: 0.4,
                        y: getTextShiftValue(),
                        ease: 'expo.out',
                    },
                    '<',
                )
                .to(wrapper, {
                    duration: 1,
                    '--stretch': '0px',
                    ease: 'elastic.out(1,0.5)',
                })
                .to(
                    props,
                    {
                        duration: 1,
                        y: 0,
                        ease: 'elastic.out(1,0.5)',
                    },
                    '<',
                )
                .from(
                    splitText.words,
                    {
                        duration: 1,
                        y: -getTextShiftValue(),
                        filter: 'blur(10px)',
                        opacity: 0,
                        stagger: 0.02,
                        ease: 'elastic.out(1.2,1)',
                        onComplete: () => splitText.revert(),
                    },
                    '<',
                )
                .progress(enableTransitions ? 0 : 1);

            onBeforeShow?.();

            document.documentElement.classList.add('-show-nav');
            document.documentElement.classList.add('-show-content');

            onAfterShow?.();

            state.interactiveTimestamp = gsap.ticker.time;
            state.interactive = true;

            resolve();
        })();
    });
}

function transitionOut(options: TransitionOutOptions): Promise<void> {
    return new Promise((resolve) => {
        const { state, heroBackground, onBeforeHide } = options;
        const { enableTransitions, lenis } = state;

        document.documentElement.classList.remove('-show-nav');

        state.heroBackgroundVisible = true;

        lenis.scrollTo(0, {
            duration: 0.8,
            immediate: window.scrollY === 0 || !state.enableTransitions,
            easing: gsap.parseEase('expo.inOut'),
            lock: true,
            onComplete: async () => {
                const fogProps = heroBackground.getFogProps();

                onBeforeHide?.();

                document.documentElement.classList.remove('-show-content');

                state.interactive = false;

                await gsap
                    .timeline()
                    .to(wrapper, {
                        duration: 0.8,
                        '--inset-top': '100%',
                        ease: 'expo.inOut',
                    })
                    .to(
                        heroBackground.scene.fog,
                        {
                            duration: 0.8,
                            ease: 'expo.in',
                            far: fogProps.farHidden,
                            near: fogProps.nearHidden,
                        },
                        '>-0.6',
                    )
                    .progress(enableTransitions ? 0 : 1);

                resolve();
            },
        });
    });
}

export { transitionIn, transitionOut };
