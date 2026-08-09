import { gsap } from 'gsap';
import { SplitText } from 'gsap/all';
import type { default as LenisInstance } from 'lenis';
import { findOrThrow } from 'spank-my-dom';
import type { State } from '../layouts/DefaultLayout';
import type { HeroBackground, HeroForeground } from './Hero';

const strapline = findOrThrow('#hero-strapline');
const wrapper = findOrThrow('main');

function transitionIn({
    state,
    heroBackground,
    heroForeground,
    onBeforeShow,
    onAfterShow,
}: {
    state: State;
    heroBackground: HeroBackground;
    heroForeground: HeroForeground;
    onBeforeShow?: () => void;
    onAfterShow?: () => void;
}): Promise<void> {
    return new Promise((resolve) => {
        const { enableTransitions } = state;

        (async () => {
            const splitText = SplitText.create(strapline, { type: 'words' });
            const fogProps = heroBackground.getFogProps();

            state.heroBackgroundVisible = true;

            await gsap
                .timeline()
                .to(heroBackground.scene.fog, {
                    duration: 1,
                    ease: 'expo.out',
                    far: fogProps.farVisible,
                    near: fogProps.nearVisible,
                })
                .to(
                    wrapper,
                    {
                        duration: 0.8,
                        '--inset-top': '100px',
                        ease: 'expo.in',
                        onComplete: () => {
                            state.heroBackgroundVisible = false;
                        },
                    },
                    '>-0.8',
                )
                .to(wrapper, {
                    duration: 0.4,
                    '--stretch': '50px',
                    ease: 'expo.out',
                })
                .to(
                    heroForeground.camera.position,
                    {
                        duration: 0.4,
                        y: heroForeground.pixelsToWorldUnits(-50),
                        ease: 'expo.out',
                    },
                    '<',
                )
                .to(wrapper, {
                    duration: 0.8,
                    '--stretch': '0px',
                    ease: 'elastic.out(1,0.5)',
                })
                .to(
                    heroForeground.camera.position,
                    {
                        duration: 0.8,
                        y: 0,
                        ease: 'elastic.out(1,0.5)',
                    },
                    '<',
                )
                .from(
                    splitText.words,
                    {
                        duration: 0.8,
                        y: -50,
                        skewX: 10,
                        autoAlpha: 0,
                        stagger: 0.02,
                        ease: 'expo.out',
                        onComplete: () => splitText.revert(),
                    },
                    '<',
                )
                .progress(enableTransitions ? 0 : 1);

            onBeforeShow?.();

            document.documentElement.classList.add('-show-nav');
            document.documentElement.classList.add('-show-content');

            onAfterShow?.();

            state.interactive = true;

            resolve();
        })();
    });
}

function transitionOut({
    state,
    heroBackground,
    lenis,
    onAfterHide,
}: {
    state: State;
    heroBackground: HeroBackground;
    lenis: LenisInstance;
    onAfterHide?: () => void;
}): Promise<void> {
    return new Promise((resolve) => {
        const { enableTransitions } = state;

        document.documentElement.classList.remove('-show-nav');

        state.heroBackgroundVisible = true;

        lenis.scrollTo(0, {
            duration: window.scrollY === 0 ? 0 : 0.6,
            easing: gsap.parseEase('expo.inOut'),
            lock: true,
            onComplete: async () => {
                const fogProps = heroBackground.getFogProps();

                document.documentElement.classList.remove('-show-content');

                onAfterHide?.();

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
