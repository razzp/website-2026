import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

interface PageState {
    trailsTimeline?: gsap.core.Timeline;
    reasonTweens: WeakMap<Element, gsap.core.Tween>;
    counterIntersecting: boolean;
    scrollY: number;
}

const pageState: PageState = {
    trailsTimeline: undefined,
    reasonTweens: new Map(),
    counterIntersecting: false,
    scrollY: 0,
};

const pageEntities = new PageEntitiesHelper();

function createTrailsTimeline(): gsap.core.Timeline {
    const plane = findOrThrow('.js-plane');

    const timeline = gsap.timeline({
        scrollTrigger: {
            trigger: '.js-trails',
            scrub: true,
            start: 'top center',
            end: 'bottom center',
        },
        defaults: {
            ease: 'none',
        },
    });

    findAll<SVGSVGElement>('.js-trail').forEach((element) => {
        const path = findOrThrow<SVGPathElement>('path', element);
        const mask = findOrThrow<SVGUseElement>('mask use', element);
        const direction = element.dataset.direction;
        const ease = element.dataset.ease;

        const scaleFactor =
            element.getBoundingClientRect().width /
            element.viewBox.baseVal.width;

        const pathLength = path.getTotalLength() * scaleFactor;

        mask.style.strokeDasharray = String(pathLength);
        mask.style.strokeDashoffset = String(pathLength);

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

function init(): void {
    // Paper plane trails.

    const trailsObserver = new ResizeObserver(() => {
        if (pageState.trailsTimeline) {
            pageState.trailsTimeline.kill();
            pageEntities.gsapAnimations.delete(pageState.trailsTimeline);
        }

        const timeline = createTrailsTimeline();

        pageState.trailsTimeline = timeline;
        pageEntities.gsapAnimations.add(timeline);
    });

    trailsObserver.observe(findOrThrow('.wrapper'));
    pageEntities.observers.add(trailsObserver);

    // Scroll pixels counter.

    const scrollCounter = findOrThrow('.js-counter');
    const scrollCounterOutput = findOrThrow('span', scrollCounter);

    pageEntities.addTicker(() => {
        if (pageState.counterIntersecting) {
            const newScrollY = window.scrollY;

            if (newScrollY !== pageState.scrollY) {
                const digits = Math.abs(newScrollY).toString().length;

                scrollCounterOutput.innerText = String(newScrollY);
                scrollCounterOutput.style.width = `${digits}ch`;

                pageState.scrollY = newScrollY;
            }
        }
    });

    const scrollCounterObserver = new IntersectionObserver(([entry]) => {
        pageState.counterIntersecting = entry.isIntersecting;
    });

    scrollCounterObserver.observe(scrollCounter);
    pageEntities.observers.add(scrollCounterObserver);

    // Thug life glasses.

    const thugTimelime = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.filter-duotone',
                scrub: true,
                start: 'top bottom',
                end: 'bottom top',
            },
            defaults: {
                ease: 'none',
            },
        })
        .fromTo(
            '.thug',
            {
                y: -20,
            },
            {
                y: 20,
            },
        );

    pageEntities.gsapAnimations.add(thugTimelime);

    /////

    const reasonTweens = pageEntities.updatable<gsap.core.Tween>({
        kill: (tween) => {
            tween?.kill();
        },
    });

    const reasonHeadingsObserver = new ResizeObserver((entries) => {
        for (const { target } of entries) {
            reasonTweens.update(
                target,
                gsap.to(target, {
                    scrollTrigger: {
                        trigger: target,
                        start: 'top center',
                        toggleClass: '-active',
                    },
                }),
            );
        }
    });

    findAll('.js-reason-heading').forEach((heading) => {
        reasonHeadingsObserver.observe(heading);
    });

    pageEntities.observers.add(reasonHeadingsObserver);
}

function destroy(): void {
    pageEntities.killAll();
}

export { destroy, init };
