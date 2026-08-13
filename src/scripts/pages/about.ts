import { gsap } from 'gsap';
import { findOrThrow } from 'spank-my-dom';
import { PageEntitiesHelper } from '../components/PageEntitiesHelper';
import { Particles } from '../components/particles';

const pageEntities = new PageEntitiesHelper();

const pageState = {
    awesome: {
        pathProgress: 0,
        rotations: [0, 0] satisfies [number, number],
        particlesIntersecting: false,
        raysIntersecting: false,
    },
};

function init(): void {
    // Day one section.

    const dayOneMaskTimeline = gsap
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

    const dayOneSplatterTimeline = gsap
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

    pageEntities.gsapAnimations.add(dayOneMaskTimeline);
    pageEntities.gsapAnimations.add(dayOneSplatterTimeline);

    // Awesome section.

    const awesome = findOrThrow('.js-awesome');
    const awesomePaths = gsap.utils.toArray<HTMLElement>('.js-awesome path');
    const awesomeRays = findOrThrow('.js-awesome-rays');
    const awesomeParticles = findOrThrow<HTMLCanvasElement>(
        '.js-awesome-particles',
    );

    const awesomeTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: awesome,
                start: 'top center',
                toggleActions: 'play none none reverse',
                onLeaveBack: () => {
                    awesomeTimeline.timeScale(5).reverse();
                    awesomeParticlesAnimation.reverse();
                },
                onEnter: () => {
                    awesomeTimeline.timeScale(1);
                    awesomeParticlesAnimation.play();
                },
            },
        })
        .set('.js-awesome g', { fill: '#00f9ff', stroke: 'none' })
        .fromTo(
            '.js-awesome svg',
            {
                scale: 0.9,
            },
            {
                scale: 1,
                duration: 1,
                ease: 'expo.out',
            },
        )
        .to(
            awesomeRays,
            {
                opacity: 1,
                scale: 1,
                ease: 'expo.out',
                duration: 1,
            },
            '<',
        )
        .fromTo(
            pageState.awesome.rotations,
            { 1: 0 },
            {
                1: 80,
                ease: 'expo.out',
                duration: 1,
            },
            '<',
        );

    const awesomePathsTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: awesome,
                scrub: true,
                start: 'top bottom',
                end: 'top center',
                onUpdate: () => {
                    const offset = String(pageState.awesome.pathProgress);

                    awesomePaths.forEach((path) => {
                        path.style.strokeDashoffset = offset;
                    });
                },
            },
            defaults: {
                ease: 'power1.in',
            },
        })
        .fromTo(
            pageState.awesome,
            {
                pathProgress: 1,
            },
            {
                pathProgress: 0,
            },
        );

    const awesomeParticlesAnimation = gsap
        .to('.js-awesome-particles', {
            opacity: 1,
        })
        .pause();

    const awesomeRaysObserver = new IntersectionObserver(
        ([entry]) => {
            pageState.awesome.raysIntersecting = entry.isIntersecting;
        },
        {
            threshold: 0,
            rootMargin: '10% 0%',
        },
    );

    awesomeRaysObserver.observe(awesomeRays);

    const awesomeParticlesInstance = new Particles({
        canvas: awesomeParticles,
        colours: ['#00f9ff', '#fff'],
        maxParticles: 50,
    });

    const awesomeParticlesIntersectionObserver = new IntersectionObserver(
        ([entry]) => {
            pageState.awesome.particlesIntersecting = entry.isIntersecting;
        },
        {
            threshold: 0,
            rootMargin: '10% 0%',
        },
    );

    awesomeParticlesIntersectionObserver.observe(awesomeParticles);

    const awesomeParticlesResizeObserver = new ResizeObserver(() => {
        awesomeParticlesInstance.resize();
    });

    awesomeParticlesResizeObserver.observe(awesomeParticles);

    pageEntities.addTicker((time) => {
        if (pageState.awesome.raysIntersecting) {
            const { awesome } = pageState;
            const rotationsSum = awesome.rotations[0] + awesome.rotations[1];

            awesomeRays.style.setProperty(
                '--rotation',
                `${rotationsSum % 360}deg`,
            );
            awesome.rotations[0] += 0.1;
        }

        if (pageState.awesome.particlesIntersecting) {
            awesomeParticlesInstance.draw(time * 1000);
        }
    });

    pageEntities.observers.add(awesomeRaysObserver);
    pageEntities.observers.add(awesomeParticlesIntersectionObserver);
    pageEntities.observers.add(awesomeParticlesResizeObserver);

    pageEntities.gsapAnimations.add(awesomeTimeline);
    pageEntities.gsapAnimations.add(awesomePathsTimeline);
    pageEntities.gsapAnimations.add(awesomeParticlesAnimation);
}

function destroy(): void {
    pageEntities.killAll();
}

export { destroy, init };
