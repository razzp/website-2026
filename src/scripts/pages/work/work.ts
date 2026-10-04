import RAPIER from '@dimforge/rapier2d-compat';
import { gsap } from 'gsap';
import { findAll, findOrThrow, setStyles } from 'spank-my-dom';
import { PageEntitiesHelper } from '../../components/PageEntitiesHelper';
import type { State } from '../../layouts/DefaultLayout';
import { getPageMeta } from '../../utils';
import { Dialog } from './components/Dialog';
import { Study } from './components/Study';
import { Tag } from './components/Tag';

interface PageState {
    mouseX: number;
    mouseY: number;
    currentScroll: number;
    scrollImpulse: number;
    inert: boolean;
    studies: {
        intersectionStates: Map<Element, IntersectionObserverEntry>;
        tagsIntersecting: boolean;
        tagsWorldRef?: symbol;
        tagsTickerRef?: symbol;
    };
}

const pageState: PageState = {
    mouseX: -10000,
    mouseY: -10000,
    currentScroll: 0,
    scrollImpulse: 0,
    inert: false,
    studies: {
        intersectionStates: new Map(),
        tagsIntersecting: false,
    },
};

const pageEntities = new PageEntitiesHelper();

function createPhysicsWorld(container: HTMLElement): {
    world: RAPIER.World;
    mouseBody: RAPIER.RigidBody;
} {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const wallThickness = 100;
    const wallRestitution = 0.8;
    const world = new RAPIER.World({ x: 0, y: 0 });

    // Top.
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(width / 2, wallThickness / 2)
            .setTranslation(width / 2, height + wallThickness / 2)
            .setRestitution(wallRestitution),
    );

    // Right.
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(wallThickness / 2, height / 2)
            .setTranslation(width + wallThickness / 2, height / 2)
            .setRestitution(wallRestitution),
    );

    // Bottom.
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(width / 2, wallThickness / 2)
            .setTranslation(width / 2, -wallThickness / 2)
            .setRestitution(wallRestitution),
    );

    // Left.
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(wallThickness / 2, height / 2)
            .setTranslation(-wallThickness / 2, height / 2)
            .setRestitution(wallRestitution),
    );

    // Mouse.
    const mouseBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setAdditionalSolverIterations(4)
        .setCcdEnabled(true);

    const mouseBody = world.createRigidBody(mouseBodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(10);

    world.createCollider(colliderDesc, mouseBody);

    return { world, mouseBody };
}

function initCaseStudiesSection(state: State): void {
    const pageMeta = getPageMeta(document);
    const mouseFollower = findOrThrow<HTMLElement>('.js-mouse-follower');
    const dialog = new Dialog(findOrThrow<HTMLDialogElement>('.js-dialog'));

    // Tags.

    const tagsContainer = findOrThrow<HTMLElement>('.js-tags-container');
    const tagsGroup = findOrThrow('.js-tags');

    const tags = findAll<HTMLElement>('.js-tag').map(
        (element) => new Tag(element),
    );

    const tagsIntersectionObserver = new IntersectionObserver(([entry]) => {
        pageState.studies.tagsIntersecting = entry.isIntersecting;
    });

    tagsIntersectionObserver.observe(tagsContainer);
    pageEntities.addObserver(tagsIntersectionObserver);

    const tagsResizeObserver = new ResizeObserver(() => {
        const { studies } = pageState;

        // Initial clean up from previous state.

        studies.tagsTickerRef && pageEntities.kill(studies.tagsTickerRef);
        studies.tagsWorldRef && pageEntities.kill(studies.tagsWorldRef);

        tagsGroup.classList.add('invisible');

        // New state.

        const { world, mouseBody } = createPhysicsWorld(tagsContainer);
        const containerRect = tagsContainer.getBoundingClientRect();

        const tagsWorldRef = pageEntities.add(world, {
            onKill: (ref) => {
                ref.free();
            },
        });

        studies.tagsWorldRef = tagsWorldRef;

        tags.forEach((tag) => {
            tag.toggleFlow(true);
        });

        tags.forEach((tag) => {
            tag.initPhysics(world, containerRect);
        });

        tags.forEach((tag) => {
            tag.toggleFlow(false);
        });

        const tagsTickerRef = pageEntities.addTicker(() => {
            world.step();

            if (studies.tagsIntersecting) {
                const { height, left, top } =
                    tagsContainer.getBoundingClientRect();

                // This could arguably be decoupled from the physics loop,
                // but that would mean managing another loop. Meh...
                setStyles(mouseFollower, {
                    '--x': `${pageState.mouseX}px`,
                    '--y': `${pageState.mouseY}px`,
                });

                if (pageState.scrollImpulse !== 0) {
                    const momentum = -pageState.scrollImpulse * 1000;

                    for (const tag of tags) {
                        tag.applyMomentum(momentum);
                    }

                    pageState.scrollImpulse = 0;
                }

                mouseBody.setNextKinematicTranslation({
                    x: pageState.mouseX - left,
                    y: height - (pageState.mouseY - top) - 5,
                });

                for (const tag of tags) {
                    tag.applyPhysics(tagsContainer.clientHeight);
                }
            }

            tagsGroup.classList.remove('invisible');
        });

        studies.tagsTickerRef = tagsTickerRef;
    });

    RAPIER.init().then(() => {
        tagsResizeObserver.observe(tagsContainer);
    });

    pageEntities.addObserver(tagsResizeObserver);

    // Case studies.

    const studies = findAll<HTMLElement>('.js-study').map(
        (element) =>
            new Study({
                state,
                pageState,
                pageMeta,
                dialog,
                element,
                tags,
                pageEntities,
            }),
    );

    const caseStudyResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            studies.find((study) => study.element === entry.target)?.resize();
        }
    });

    const caseStudyIntersectionObserver = new IntersectionObserver(
        (entries) => {
            const { intersectionStates } = pageState.studies;

            entries.forEach((entry) => {
                intersectionStates.set(entry.target, entry);
            });

            tags.forEach((tag) => {
                tag.toggle(false);
            });

            const dominantEntry = [...intersectionStates.values()]
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

            if (dominantEntry) {
                studies
                    .find(({ element }) => element === dominantEntry.target)
                    ?.toggleTags(true);
            }
        },
        {
            threshold: 0.5,
        },
    );

    studies.forEach((study) => {
        caseStudyResizeObserver.observe(study.element);
        caseStudyIntersectionObserver.observe(study.element);
    });

    pageEntities.addObserver(caseStudyIntersectionObserver);
    pageEntities.addObserver(caseStudyResizeObserver);
}

function initLogosSection(): void {
    gsap.timeline({
        scrollTrigger: {
            trigger: '.js-logos',
            scrub: true,
            start: 'top bottom',
            end: 'center center',
        },
    }).fromTo(
        '.js-logo',
        {
            y: 10,
            x: 10,
            rotate: '-10deg',
            opacity: 0,
        },
        {
            y: 0,
            x: 0,
            rotate: '0deg',
            opacity: 1,
            stagger: 0.1,
        },
    );
}

function initProjectsSection(): void {
    gsap.timeline({
        scrollTrigger: {
            trigger: '.js-18-wrapper',
            scrub: true,
            start: 'top bottom',
            end: 'center center',
        },
    }).fromTo(
        '.js-18',
        {
            x: '-50%',
            rotate: '-45deg',
        },
        {
            x: '0%',
            rotate: '10deg',
            opacity: 1,
        },
    );
}

function init(state: State): void {
    const { lenis } = state;

    // Track mouse movement.

    const mouseCoordsController = new AbortController();

    document.addEventListener(
        'pointermove',
        (event) => {
            if (pageState.inert) return;

            pageState.mouseX = event.clientX;
            pageState.mouseY = event.clientY;
        },
        { passive: true, signal: mouseCoordsController.signal },
    );

    pageEntities.addController(mouseCoordsController);

    // This trick seems to prevent the history API's scroll
    // restoration mechanic from triggering a huge impulse.
    requestAnimationFrame(() => {
        pageState.currentScroll = lenis.scroll;

        const unsubscribe = lenis.on('scroll', ({ scroll }) => {
            const delta = scroll - pageState.currentScroll;

            pageState.currentScroll = scroll;
            pageState.scrollImpulse += delta;
        });

        pageEntities.add(unsubscribe, {
            onKill: (ref) => {
                ref();
            },
        });
    });

    // Initialise sections.

    initCaseStudiesSection(state);
    initLogosSection();
    initProjectsSection();
}

function destroy(): void {
    pageEntities.killAll();
    pageState.studies.intersectionStates.clear();
}

export { destroy, init, type PageState };
