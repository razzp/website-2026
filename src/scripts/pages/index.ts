import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

const pageState = {
    tldrStrokeProgress: 0,
};

const pageEntities = new PageEntitiesHelper();

function init(): void {
    // TL;DR text.

    const tlddr = findOrThrow('#tldr');
    const tldrPaths = findAll('path', tlddr);

    const tldrTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: tlddr,
                scrub: true,
                start: 'center bottom',
                end: 'center center',
            },
            defaults: {
                ease: 'none',
            },
            onUpdate: () => {
                tldrPaths.forEach((path) => {
                    path.style.strokeDashoffset = String(
                        pageState.tldrStrokeProgress,
                    );
                });

                if (pageState.tldrStrokeProgress <= 0) {
                    tlddr.classList.add('-bright');
                } else {
                    tlddr.classList.remove('-bright');
                }
            },
        })
        .fromTo(
            pageState,
            {
                tldrStrokeProgress: 1,
            },
            {
                tldrStrokeProgress: 0,
            },
        );

    pageEntities.gsapTimelines.add(tldrTimeline);

    // Thug life glasses.

    const thugTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: tlddr,
                start: 'center center',
                toggleActions: 'play none none reverse',
            },
            defaults: {
                ease: 'expo.out',
            },
        })
        .fromTo(
            '.thug',
            {
                x: '-100px',
                y: '-20px',
                opacity: 0,
            },
            {
                x: '0px',
                y: '0px',
                opacity: 1,
            },
        );

    pageEntities.gsapTimelines.add(thugTimeline);

    // Keywords carousel

    const keywordsLines = gsap.utils.toArray('#keywords .keywords-line');
    const evenLines = keywordsLines.filter((_, i) => i % 2 === 0);
    const oddLines = keywordsLines.filter((_, i) => i % 2 === 1);

    const keywordsTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '#keywords',
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
            defaults: {
                ease: 'none',
            },
        })
        .fromTo(
            evenLines,
            {
                x: -500,
            },
            {
                x: 500,
            },
            0,
        )
        .fromTo(
            oddLines,
            {
                x: 500,
            },
            {
                x: -500,
            },
            0,
        );

    pageEntities.gsapTimelines.add(keywordsTimeline);

    console.log('index initialised');
}

function initSafe(): void {
    // Blurb markers.

    findAll('.blurb').forEach((blurb) => {
        const marks = findAll('.mark > span', blurb);

        if (!marks.length) return;

        const blurbTimeline = gsap
            .timeline({
                scrollTrigger: {
                    trigger: blurb,
                    start: 'bottom bottom',
                    toggleActions: 'play none none reverse',
                },
                defaults: {
                    ease: 'expo.out',
                },
            })
            .to(marks, {
                clipPath: 'inset(0 0% 0 0 round 5px)',
                stagger: 0.05,
            });

        pageEntities.gsapTimelines.add(blurbTimeline);
    });

    // Seen enough?

    const drawConnections = drawConnectionsFactory();

    drawConnections();

    const arrows = gsap.utils.toArray('.connection-yep .arrow');
    const yepHeading = findOrThrow('.connection-yep .heading');

    const enoughTimeline = gsap
        .timeline({
            paused: true,
            scrollTrigger: {
                trigger: '.option-box',
                start: 'bottom bottom',
                toggleActions: 'play none none reverse',
                onEnter: () => {
                    yepHeading.classList.add('-highlight');
                },
                onLeaveBack: () => {
                    yepHeading.classList.remove('-highlight');
                },
            },
            defaults: {
                ease: 'expo.in',
            },
        })
        .fromTo(
            arrows,
            {
                '--distance': '200px',
                opacity: 0,
            },
            {
                '--distance': '75px',
                opacity: 1,
                stagger: {
                    each: 0.05,
                    from: 'random',
                },
                duration: 0.5,
            },
        );

    pageEntities.gsapTimelines.add(enoughTimeline);
}

function drawConnectionsFactory(): () => void {
    const yep = findOrThrow('.connection-yep');
    const nope = findOrThrow('.connection-nope');
    const svg = findOrThrow('svg.connections');

    return () => {
        // Get bounding rects.
        const yepRect = yep.getBoundingClientRect();
        const nopeRect = nope.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const center = svgRect.width / 2;

        // Resize the SVG to match its container.
        svg.setAttribute('viewBox', `0 0 ${svgRect.width} ${svgRect.height}`);

        // Draw the connections.
        const d = `
                M ${center} 3
                C ${center} ${svgRect.height * 0.8 - 3}, ${yepRect.width / 2} ${svgRect.height * 0.2 + 3}, ${yepRect.width / 2} ${svgRect.height - 3}
                M ${center} 3
                C ${center} ${svgRect.height * 0.8 - 3}, ${nopeRect.left - svgRect.left + nopeRect.width / 2} ${svgRect.height * 0.2 + 3}, ${nopeRect.left - svgRect.left + nopeRect.width / 2} ${svgRect.height - 3}
            `;

        svg.querySelector('path')?.setAttribute('d', d);
    };
}

function destroy(): void {
    pageEntities.killAll();

    console.log('index destroyed');
}

export { destroy, init, initSafe };
