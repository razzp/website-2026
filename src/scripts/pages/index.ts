import { gsap } from 'gsap';
import { findAll, findOrThrow } from 'spank-my-dom';
import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

interface PageState {
    tldr: {
        pathProgress: number;
    };
}

const pageState: PageState = {
    tldr: {
        pathProgress: 0,
    },
};

const pageEntities = new PageEntitiesHelper();

function init(): void {
    // TL;DR text.

    const tlddr = findOrThrow('.js-tldr');
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
                        pageState.tldr.pathProgress,
                    );
                });

                if (pageState.tldr.pathProgress <= 0) {
                    tlddr.classList.add('-bright');
                } else {
                    tlddr.classList.remove('-bright');
                }
            },
        })
        .fromTo(
            pageState.tldr,
            {
                pathProgress: 1,
            },
            {
                pathProgress: 0,
            },
        );

    pageEntities.gsapAnimations.add(tldrTimeline);

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
                duration: 0.6,
            },
        })
        .fromTo(
            '.thug',
            {
                y: '-100%',
                opacity: 0,
            },
            {
                y: '0%',
                opacity: 1,
            },
        );

    pageEntities.gsapAnimations.add(thugTimeline);

    // Keywords carousel

    const keywordsLines = gsap.utils.toArray('.js-keywords .js-keywords-line');
    const evenLines = keywordsLines.filter((_, i) => i % 2 === 0);
    const oddLines = keywordsLines.filter((_, i) => i % 2 === 1);

    const keywordsTimeline = gsap
        .timeline({
            scrollTrigger: {
                trigger: '.js-keywords',
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

    pageEntities.gsapAnimations.add(keywordsTimeline);

    // Blurb markers.

    findAll('.js-blurb').forEach((blurb) => {
        const marks = findAll('.js-mark', blurb);

        if (!marks.length) return;

        const markSpans = marks.map((mark) => {
            const span = document.createElement('span');

            span.dataset.text = mark.innerText;

            mark.appendChild(span);
            mark.classList.add('x-mark');

            return span;
        });

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
            .to(markSpans, {
                clipPath: 'inset(0 0% 0 0 round 5px)',
                stagger: 0.05,
            });

        pageEntities.gsapAnimations.add(blurbTimeline);
    });

    // Seen enough?

    const drawConnections = drawConnectionsFactory();

    const connections = findOrThrow('.js-connections');
    const arrows = gsap.utils.toArray('.js-connection-yep .js-arrow');
    const yepHeading = findOrThrow('.js-connection-yep .js-heading');

    const enoughTimeline = gsap
        .timeline({
            paused: true,
            scrollTrigger: {
                trigger: '.js-option-box',
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

    const enoughResizeObserver = new ResizeObserver(() => {
        drawConnections();
    });

    enoughResizeObserver.observe(connections);

    pageEntities.observers.add(enoughResizeObserver);
    pageEntities.gsapAnimations.add(enoughTimeline);
}

function drawConnectionsFactory(): () => void {
    const svg = findOrThrow('.js-connections');
    const circle = findOrThrow('circle', svg);
    const yep = findOrThrow('.js-connection-yep');
    const nope = findOrThrow('.js-connection-nope');

    return () => {
        // Get bounding rects.
        const yepRect = yep.getBoundingClientRect();
        const nopeRect = nope.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const center = svgRect.width / 2;

        circle.setAttribute('cx', `${center}`);

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
}

export { destroy, init };
