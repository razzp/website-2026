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
import { Hover3D } from '../components/Hover3D';
import { PageEntitiesHelper } from '../components/PageEntitiesHelper';
import { StickyElementGroup } from '../components/StickyElements';
import type { State } from '../layouts/DefaultLayout';
import {
    degreesToRadians,
    getCameraOffsetY,
    getPageMeta,
    pixelsToWorldUnits,
} from '../utils';

interface PageState {
    trailsTimelineRef?: symbol;
    reasonTimelineRefs: WeakMap<Element, symbol>;
    fiveSectionIntersecting: boolean;
    scrollY: number;
}

const pageState: PageState = {
    reasonTimelineRefs: new WeakMap(),
    fiveSectionIntersecting: false,
    scrollY: 0,
};

const pageEntities = new PageEntitiesHelper();

function init(state: State): void {
    // Paper plane trails.

    const trails = findOrThrow('.js-trails');

    const trailsObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        pageState.trailsTimelineRef &&
            pageEntities.kill(pageState.trailsTimelineRef);

        const timeline = createTrailsTimeline(trails);

        pageState.trailsTimelineRef = pageEntities.addGsapAnimation(timeline);
    });

    trailsObserver.observe(trails);
    pageEntities.addObserver(trailsObserver);

    // Reason blocks.

    const reasonHeadingsObserver = new ResizeObserver((entries) => {
        for (const { target } of entries) {
            const previousRef = pageState.reasonTimelineRefs.get(target);

            previousRef && pageEntities.kill(previousRef);

            const timeline = gsap
                .timeline({
                    scrollTrigger: {
                        trigger: target,
                        start: 'bottom bottom',
                        onEnter: () => timeline.play(),
                        onLeaveBack: () => timeline.reverse(),
                    },
                    defaults: {
                        ease: 'elastic.inOut(1,1)',
                    },
                })
                .fromTo(
                    findOrThrow('span', target),
                    {
                        rotate: 180,
                    },
                    {
                        rotate: 0,
                        duration: 1,
                    },
                );

            pageEntities.addGsapAnimation(timeline);
        }
    });

    findAll('.js-reason-heading').forEach((heading) => {
        reasonHeadingsObserver.observe(heading);
    });

    pageEntities.addObserver(reasonHeadingsObserver);

    // Five section.

    initFiveSection(state.threeJsFont);

    // Suggestion buttons.

    const suggestionButtons = findAll<HTMLElement>('.js-elastic-button');

    pageEntities.add(new StickyElementGroup(suggestionButtons), {
        onKill: (ref) => {
            ref.kill();
        },
    });

    findAll<HTMLElement>('.js-hover-3d').forEach((element) => {
        pageEntities.add(new Hover3D(element), {
            onKill: (ref) => {
                ref.kill();
            },
        });
    });
}

function createTrailsTimeline(container: Element): gsap.core.Timeline {
    const plane = findOrThrow('.js-plane');

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: container,
            scrub: 4,
            start: 'top center',
            end: 'bottom center',
        },
        defaults: {
            ease: 'none',
        },
    });

    findAll<SVGSVGElement>('.js-trail', container).forEach((element) => {
        const path = findOrThrow<SVGPathElement>('path', element);
        const mask = findOrThrow<SVGUseElement>('mask use', element);
        const direction = element.dataset.direction;
        const ease = element.dataset.ease;

        const scaleFactor =
            element.getBoundingClientRect().width /
            element.viewBox.baseVal.width;

        const pathLength = path.getTotalLength() * scaleFactor;

        mask.style.strokeDasharray = `${pathLength}`;
        mask.style.strokeDashoffset = `${pathLength}`;

        timeline
            .set(plane, {
                '--scale-y': direction === 'ltr' ? 1 : -1,
            })
            .to(plane, {
                motionPath: {
                    path,
                    align: path,
                    alignOrigin: [0.5, 0.5],
                    autoRotate: true,
                },
                ease,
            })
            .fromTo(
                mask.style,
                {
                    strokeDashoffset: pathLength,
                },
                {
                    strokeDashoffset: 0,
                    ease,
                },
                '<',
            );
    });

    return timeline;
}

function initFiveSection(font: Font): void {
    const pageMeta = getPageMeta(document);
    const container = findOrThrow('.js-five');
    const placeholder = findOrThrow('.js-five-placeholder');

    // THREE stuff.

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, undefined, 0.1, 1000);
    const textDepth = 20;

    camera.position.set(0, 0, 100);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    pageEntities.addThreeRenderer(renderer);

    const light = new HemisphereLight(
        0xffffff,
        pageMeta.theme.primaryContrast,
        20,
    );

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
    container.appendChild(renderer.domElement);

    const resizeObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        pageEntities.reset(threeTextMeshRef);

        // New state.

        const containerRect = container.getBoundingClientRect();
        const placeholderRect = placeholder.getBoundingClientRect();

        camera.aspect = containerRect.width / containerRect.height;

        camera.setViewOffset(
            containerRect.width,
            containerRect.height,
            0,
            getCameraOffsetY(containerRect, placeholderRect),
            containerRect.width,
            containerRect.height,
        );

        camera.updateProjectionMatrix();

        renderer.setSize(containerRect.width, containerRect.height, false);

        const geometry = new TextGeometry('5.', {
            depth: textDepth,
            font,
            size: pixelsToWorldUnits(placeholderRect.height, camera, renderer),
            bevelEnabled: false,
        });

        geometry.center();
        geometry.translate(0, 0, -(textDepth / 2));

        textMesh.geometry = geometry;
    });

    resizeObserver.observe(container);
    pageEntities.addObserver(resizeObserver);

    const fiveTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-five',
                scrub: true,
                start: 'top bottom',
                end: 'center center',
            },
            defaults: {
                ease: 'none',
            },
        })
        .fromTo(
            textMesh.rotation,
            {
                y: degreesToRadians(90),
            },
            {
                y: degreesToRadians(0),
                ease: 'power1.out',
            },
            '<',
        );

    pageEntities.addGsapAnimation(fiveTimeline);

    // Scroll pixels counter.

    const scrollCounter = findOrThrow('.js-counter');
    const scrollCounterOutput = findOrThrow('span', scrollCounter);

    pageEntities.addTicker(() => {
        if (pageState.fiveSectionIntersecting) {
            const newScrollY = window.scrollY;

            if (newScrollY !== pageState.scrollY) {
                const digits = Math.abs(newScrollY).toString().length;

                scrollCounterOutput.innerText = `${newScrollY}`;
                scrollCounterOutput.style.width = `${digits}ch`;

                pageState.scrollY = newScrollY;
            }
        }
    });

    pageEntities.addGsapTicker(() => {
        if (pageState.fiveSectionIntersecting) {
            renderer.render(scene, camera);
        }
    });

    // Thug photo.

    const thugTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-five-container',
                scrub: true,
                start: 'top bottom',
                end: 'top top',
            },
            defaults: {
                ease: 'power1.out',
            },
        })
        .from('.js-peek', {
            x: '100%',
        });

    pageEntities.addGsapAnimation(thugTimeline);

    // Intersection observer.

    const fiveIntersectionObserver = new IntersectionObserver(([entry]) => {
        pageState.fiveSectionIntersecting = entry.isIntersecting;
    });

    fiveIntersectionObserver.observe(container);
    pageEntities.addObserver(fiveIntersectionObserver);
}

function destroy(): void {
    pageEntities.killAll();
}

export { destroy, init };
