import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import {
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
} from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { PageEntitiesHelper } from '../../components/PageEntitiesHelper';
import type { State } from '../../layouts/DefaultLayout';
import {
    expoInWithInitialVelocity,
    getCameraOffsetY,
    getPageMeta,
    pixelsToWorldUnits,
} from '../../utils';
import { Path } from './components/Path';
import { getActiveTimelineLabel } from './utils';

interface Segment {
    label: string;
}

interface SegmentWithPath extends Segment {
    path: Path;
}

interface PageState {
    boring: {
        mainTimelineRef?: symbol;
        threeTimelineRef?: symbol;
    };
}

const pageState: PageState = {
    boring: {},
};

const pageEntities = new PageEntitiesHelper();

function init(state: State): void {
    initDayOneSection();
    initDayThumbs();
    initBoringSection(state.threeJsFont);
}

function initDayOneSection(): void {
    const maskTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-hero-heading',
                scrub: true,
                start: 'bottom bottom',
                end: 'bottom center',
            },
            defaults: {
                ease: 'power1.in',
            },
        })
        .fromTo(
            '.js-hero',
            {
                '--mask-size': '0%',
            },
            {
                '--mask-size': '100%',
            },
        );

    const splatterTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-day-one',
                scrub: true,
                start: 'top center',
                end: 'bottom center',
            },
            defaults: {
                ease: 'power2.out',
            },
        })
        .fromTo(
            '.js-splatter-front',
            {
                y: '50%',
                scale: 0,
            },
            {
                y: '0%',
                scale: 1,
            },
            0,
        )
        .fromTo(
            '.js-splatter-back',
            {
                y: '100%',
                scale: 0,
            },
            {
                y: '0%',
                scale: 1.5,
            },
            0,
        );

    pageEntities.addGsapAnimation(maskTimeline);
    pageEntities.addGsapAnimation(splatterTimeline);
}

function initDayThumbs(): void {
    const start = Date.UTC(1988, 10, 9);
    const today = Date.now();
    const daysSince = Math.floor((today - start) / 86_400_000);

    findOrThrow('.js-days-elapsed').innerText = `${daysSince}`;

    const timeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-day-thumbs',
                scrub: true,
                start: 'center bottom',
                end: 'center center',
            },
            defaults: {
                ease: 'none',
            },
        })
        .fromTo(
            '.js-day-thumb',
            {
                '--pos': '0%',
            },
            {
                '--pos': '100%',
                stagger: 0.1,
            },
        );

    pageEntities.addGsapAnimation(timeline);
}

function initBoringSection(font: Font): void {
    const pageMeta = getPageMeta(document);
    const container = findOrThrow('.js-boring-container');
    const dot = findOrThrow('.js-boring-dot');
    const flash = findOrThrow('.js-boring-flash');
    const rays = findOrThrow('.js-boring-rays');
    const awesomeSvg = findOrThrow<SVGSVGElement>('.js-boring-svg');
    const awesomeSvgGroup = findOrThrow<SVGGElement>('g', awesomeSvg);
    const paths = findAll<SVGPathElement>('path', awesomeSvg);
    const threeContainer = findOrThrow('.js-boring-three');

    // Set up the THREE scene.

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, undefined, 0.1, 1000);
    const textDepth = 20;

    camera.position.set(0, 0, 100);

    const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    pageEntities.addThreeRenderer(renderer);

    const light = new HemisphereLight(0xffffff, pageMeta.theme.primary, 20);

    scene.add(light);

    const textMesh = new Mesh(undefined, [
        new MeshBasicMaterial({
            color: pageMeta.theme.primary,
        }),
        new MeshStandardMaterial({
            color: pageMeta.theme.primaryContrast,
        }),
    ]);

    const threeTextMeshRef = pageEntities.add(textMesh, {
        onReset: (ref) => {
            ref.geometry?.dispose();
        },
    });

    scene.add(textMesh);
    threeContainer.appendChild(renderer.domElement);

    // Set up all the 2D stuff.

    // Create the rays animation. This can use the Web Animations API
    // for simplicity and performance, but we'll use GSAP next to
    // create a time ramp effects when it's revealed.
    const raysAnimation = rays.animate(
        { '--about-rays-rotation': ['0deg', '360deg'] },
        { duration: 60_000, iterations: Infinity },
    );

    raysAnimation.pause();

    // We can directly tween the `playbackRate` property to create
    // a really cool time ramp effect.
    const raysRevealTimeline = gsap
        .timeline({
            defaults: {
                duration: 2,
                ease: 'expo.out',
            },
        })
        .fromTo(raysAnimation, { playbackRate: 150 }, { playbackRate: 1 })
        .fromTo(
            rays,
            {
                opacity: 0,
                scale: 0,
            },
            {
                opacity: 1,
                scale: 1,
            },
            '<',
        )
        .pause();

    const raysAnimationRef = pageEntities.addAnimation(raysAnimation);

    const raysRevealTimelineRef =
        pageEntities.addGsapAnimation(raysRevealTimeline);

    // Create a resize observer for all the dynamic stuff...

    const resizeObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        const { threeTimelineRef, mainTimelineRef } = pageState.boring;

        threeTimelineRef && pageEntities.kill(threeTimelineRef);
        mainTimelineRef && pageEntities.kill(mainTimelineRef);

        pageEntities.reset(
            threeTextMeshRef,
            raysAnimationRef,
            raysRevealTimelineRef,
        );

        awesomeSvg.style.transform = '';
        awesomeSvg.removeAttribute('data-segment');

        // THREE stuff.

        const containerRect = container.getBoundingClientRect();
        const svgRect = awesomeSvg.getBoundingClientRect();

        const strokeWidth =
            parseFloat(getComputedStyle(awesomeSvgGroup).strokeWidth) || 0;

        camera.aspect = containerRect.width / containerRect.height;

        camera.setViewOffset(
            containerRect.width,
            containerRect.height,
            0,
            getCameraOffsetY(containerRect, svgRect),
            containerRect.width,
            containerRect.height,
        );

        camera.updateProjectionMatrix();

        renderer.setSize(containerRect.width, containerRect.height, false);

        const geometry = new TextGeometry('awesome', {
            depth: textDepth,
            font,
            size: pixelsToWorldUnits(
                svgRect.height + strokeWidth,
                camera,
                renderer,
            ),
            bevelEnabled: false,
        });

        geometry.center();
        geometry.translate(0, 0, textDepth / 2);

        textMesh.geometry = geometry;

        const threeTimeline = gsap
            .timeline({
                defaults: {
                    ease: 'elastic.out(1,0.2)',
                    duration: 2,
                },
                onUpdate: () => {
                    renderer.render(scene, camera);
                },
            })
            .fromTo(textMesh.scale, { z: 0 }, { z: 1 })
            .fromTo(textMesh.position, { z: 0 }, { z: 1 }, '<')
            .pause();

        pageState.boring.threeTimelineRef =
            pageEntities.addGsapAnimation(threeTimeline);

        // 2D stuff.

        const dotRect = dot.getBoundingClientRect();
        const dotOffset = dotRect.top - containerRect.top;

        container.style.setProperty('--svg-mask-offset', `${dotOffset}px`);

        const pathInstances = paths.map((path) => new Path(path, awesomeSvg));

        const segment1: SegmentWithPath = {
            label: 'segment-1',
            path: pathInstances[8],
        };

        const segment2: SegmentWithPath = {
            label: 'segment-2',
            path: pathInstances[9],
        };

        const segment3: Segment = {
            label: 'segment-3',
        };

        let previousTime = 0;

        const mainTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.js-boring',
                start: 'top top',
                end: '+=5000',
                pin: true,
                scrub: true,
                //snap: "labelsDirectional"
            },
            defaults: {
                ease: 'none',
            },
            onUpdate: () => {
                const currentTime = mainTimeline.time();
                const segment4Time = mainTimeline.labels['segment-4'];
                const direction = currentTime >= previousTime ? 1 : -1;

                // TODO: Revisit this and try to find a better solution...

                awesomeSvg.style.transform = '';

                // The following are called on EVERY frame.

                switch (getActiveTimelineLabel(mainTimeline)) {
                    case segment1.label: {
                        const { x, y } = segment1.path.getCurrentPoint();

                        awesomeSvg.dataset.segment = '1';
                        awesomeSvg.style.transform = `scale(4) rotate3d(1,-1,1,60deg) translate(${x}px,${y}px)`;
                        break;
                    }
                    case segment2.label: {
                        const { x, y } = segment2.path.getCurrentPoint();

                        awesomeSvg.dataset.segment = '2';
                        awesomeSvg.style.transform = `scale(3) rotate3d(-1,-1,-1,60deg) translate(${x}px,${y}px)`;
                        break;
                    }
                    case segment3.label: {
                        awesomeSvg.dataset.segment = '3';
                        break;
                    }
                }

                // The following are ONLY called when the playhead crosses
                // a specific point, either forwards or backwards.

                if (
                    direction === 1 &&
                    previousTime < segment4Time &&
                    currentTime >= segment4Time
                ) {
                    threeTimeline.play();
                    raysAnimation.play();
                    raysRevealTimeline.play();
                }

                if (
                    direction === -1 &&
                    previousTime > segment4Time &&
                    currentTime <= segment4Time
                ) {
                    threeTimeline.seek(0).pause();
                    raysAnimation.pause();
                    raysRevealTimeline.seek(0).pause();
                }

                previousTime = currentTime;
            },
        });

        const addPathsAnimation = (options: {
            duration: number;
            position?: gsap.Position;
            startPercent?: number;
            endPercent?: number;
            ease?: gsap.EaseString | gsap.EaseFunction;
        }) => {
            const {
                duration,
                startPercent = 0,
                endPercent = 100,
                ease = 'none',
            } = options;

            pathInstances.forEach((path) => {
                mainTimeline.fromTo(
                    path,
                    {
                        strokePosition:
                            path.getPathLengthAtPercent(startPercent),
                    },
                    {
                        strokePosition: path.getPathLengthAtPercent(endPercent),
                        duration,
                        ease,
                    },
                    '<',
                );
            });
        };

        const addFlashAnimation = () => {
            mainTimeline
                .fromTo(
                    flash,
                    {
                        opacity: 0,
                    },
                    {
                        opacity: 1,
                        duration: 1,
                        ease: 'expo.in',
                    },
                    '>-1',
                )
                .to(flash, {
                    opacity: 0,
                    duration: 2,
                    ease: 'expo.out',
                });
        };

        mainTimeline.addLabel(segment1.label);

        addPathsAnimation({
            duration: 10,
            startPercent: 0,
            endPercent: 50,
        });

        addFlashAnimation();

        mainTimeline.addLabel(segment2.label, '>-2');

        addPathsAnimation({
            duration: 10,
            startPercent: 25,
            endPercent: 75,
        });

        addFlashAnimation();

        mainTimeline.addLabel(segment3.label, '>-2').set(
            dot,
            {
                opacity: 0,
            },
            '<',
        );

        addPathsAnimation({
            duration: 10,
            startPercent: 50,
            endPercent: 100,
            ease: expoInWithInitialVelocity(0.25),
        });

        mainTimeline.fromTo(
            awesomeSvg,
            {
                '--glow-strength': 0,
            },
            {
                '--glow-strength': 1,
                duration: 10,
                ease: expoInWithInitialVelocity(0.25),
            },
            '<',
        );

        addFlashAnimation();

        mainTimeline
            .addLabel('segment-4', '>-2')
            .set(
                threeContainer,
                {
                    opacity: 1,
                },
                '>-2',
            )
            .set(
                awesomeSvg,
                {
                    opacity: 0,
                },
                '<',
            )
            .to({}, { duration: 10 });

        pageState.boring.mainTimelineRef =
            pageEntities.addGsapAnimation(mainTimeline);
    });

    resizeObserver.observe(container);
    pageEntities.addObserver(resizeObserver);
}

function destroy(): void {
    pageEntities.killAll();
}

export { destroy, init };
