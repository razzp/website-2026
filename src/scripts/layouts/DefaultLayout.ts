import { gsap } from 'gsap';
import { ScrollTrigger, SplitText } from 'gsap/all';
import Lenis from 'lenis';
import { findOrThrow } from 'spank-my-dom';
import * as THREE from 'three';
import { Font, type FontData } from 'three/addons/loaders/FontLoader.js';
import fontData from '../../fonts/Nunito_Regular.json';
import { HeroBackground, HeroForeground } from '../components/Hero';
import { getPageConfig, loadPage } from '../components/PageManager';
import { isSpecialClick } from '../utils';

gsap.registerPlugin(SplitText);

const state = {
    renderBackground: true,
    mouse: new THREE.Vector2(),
};

const lenis = new Lenis();
// The runtime data is fine, but TypeScript infers the JSON as its exact structural type,
// and there are some discrepancies between this and the FontData typings.
const font = new Font(fontData as unknown as FontData);
const wrapper = findOrThrow('main');
const placeholder = findOrThrow('#hero-placeholder');
const strapline = findOrThrow('#hero-strapline');
const maxRotation = 0.1;
const heading = findOrThrow('h1').textContent.toLowerCase();
const { theme } = getPageConfig(document);

const heroForeground = new HeroForeground({
    container: findOrThrow('#hero-foreground'),
    font,
    placeholder,
    text: heading,
    colour: theme.meshFace,
});

const heroBackground = new HeroBackground({
    container: findOrThrow('#hero-background'),
    font,
    placeholder,
    text: heading,
    colour: theme.primaryContrast,
});

async function init(): Promise<void> {
    await Promise.all([heroBackground.compile(), heroForeground.compile()]);

    heroForeground.resize();
    heroBackground.resize();

    gsap.ticker.lagSmoothing(0);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);

        const targetX = state.mouse.y * maxRotation;
        const targetY = state.mouse.x * maxRotation;

        heroForeground.mesh.rotation.x +=
            (targetX - heroForeground.mesh.rotation.x) * 0.1;
        heroForeground.mesh.rotation.y +=
            (targetY - heroForeground.mesh.rotation.y) * 0.1;

        heroBackground.mesh.rotation.x +=
            (targetX - heroBackground.mesh.rotation.x) * 0.1;
        heroBackground.mesh.rotation.y +=
            (targetY - heroBackground.mesh.rotation.y) * 0.1;

        heroForeground.render();

        if (state.renderBackground) {
            heroBackground.render();
        }
    });

    triggerMouseHint(window.scrollY);

    lenis.on('scroll', ({ scroll }) => {
        triggerMouseHint(scroll);
        ScrollTrigger.update;
    });

    transitionIn();

    document
        .querySelectorAll<HTMLAnchorElement>('a[data-link-swap]')
        .forEach((link) => {
            link.addEventListener('click', async (event) => {
                if (isSpecialClick(event)) return;

                event.preventDefault();

                const page = await loadPage(link.href, {
                    whileLoading: transitionOut,
                });

                heroBackground.setText(page.heading.toLowerCase());
                heroForeground.setText(page.heading.toLowerCase());

                heroBackground.resize();
                heroForeground.resize();

                heroForeground.setColour(page.theme.meshFace);
                heroBackground.setColour(page.theme.primaryContrast);

                await new Promise((resolve) => setTimeout(resolve, 100));

                for (const [key, value] of Object.entries(page.theme)) {
                    if (key === 'primary') continue;

                    document.documentElement.style.setProperty(
                        `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
                        value,
                    );
                }

                const colourTween = document.documentElement.animate(
                    {
                        '--theme-primary': page.theme.primary,
                    },
                    {
                        duration: 600,
                        fill: 'forwards',
                        easing: 'ease',
                    },
                );

                await colourTween.finished;
                await transitionIn();
            });
        });

    /*window.addEventListener('popstate', () => {
        pageManager.loadPage(location.href, { push: false });
    });*/
}

function setMouseVectors(event: MouseEvent): void {
    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function transitionIn(): Promise<void> {
    return new Promise((resolve) => {
        (async () => {
            const splitText = SplitText.create(strapline, { type: 'words' });
            const fogProps = heroBackground.getFogProps();

            state.renderBackground = true;

            await gsap
                .timeline()
                .to(heroBackground.scene.fog, {
                    duration: 0.8,
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
                            state.renderBackground = false;
                        },
                    },
                    '>-0.6',
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
                );

            document.documentElement.classList.add('-show-nav');
            document.documentElement.classList.add('-show-content');
            window.addEventListener('pointermove', setMouseVectors);

            resolve();
        })();
    });
}

function transitionOut(): Promise<void> {
    return new Promise((resolve) => {
        document.documentElement.classList.remove('-show-nav');

        state.renderBackground = true;

        lenis.scrollTo(0, {
            duration: window.scrollY === 0 ? 0 : 0.6,
            easing: gsap.parseEase('expo.inOut'),
            lock: true,
            onComplete: async () => {
                const fogProps = heroBackground.getFogProps();

                document.documentElement.classList.remove('-show-content');
                window.removeEventListener('pointermove', setMouseVectors);

                await gsap
                    .timeline()
                    .to(wrapper, {
                        duration: 0.8,
                        '--inset-top': '100%',
                        ease: 'expo.inOut',
                    })
                    .to(
                        state.mouse,
                        {
                            duration: 0.8,
                            x: 0,
                            y: 0,
                            ease: 'expo.inOut',
                        },
                        '<',
                    )
                    .to(
                        heroBackground.scene.fog,
                        {
                            duration: 0.8,
                            ease: 'expo.in',
                            far: fogProps.farHidden,
                            near: fogProps.nearHidden,
                        },
                        '>-0.6',
                    );

                resolve();
            },
        });
    });
}

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

export { init };
