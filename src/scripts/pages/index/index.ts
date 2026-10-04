import { assertIsNotNull } from 'bossy-boots';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/all';
import {
    findAll,
    findOrThrow,
    getData,
    parseJson,
    setStyles,
} from 'spank-my-dom';
import { PageEntitiesHelper } from '../../components/PageEntitiesHelper';
import { Particles } from '../../components/particles';
import { StickyElement } from '../../components/StickyElements';
import { getPageMeta } from '../../utils';
import { Slice } from './components/Slice';

interface SpinWheelData {
    name: string;
    href: string;
    colour: string;
    colourContrast: string;
}

interface PageState {
    tldr: {
        pathProgress: number;
    };
    spin: {
        timelineRef?: symbol;
        isSpinning: boolean;
    };
}

const pageState: PageState = {
    tldr: {
        pathProgress: 0,
    },
    spin: {
        isSpinning: false,
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
                    path.style.strokeDashoffset = `${pageState.tldr.pathProgress}`;
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

    pageEntities.addGsapAnimation(tldrTimeline);

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

    pageEntities.addGsapAnimation(thugTimeline);

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

    pageEntities.addGsapAnimation(keywordsTimeline);

    // Blurb markers.

    findAll('.js-blurb').forEach((blurb) => {
        const marks = findAll<HTMLElement>('.js-mark', blurb);

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

        pageEntities.addGsapAnimation(blurbTimeline);
    });

    // Seen enough?

    const drawConnections = createDrawConnectionsFunc();
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

    pageEntities.addObserver(enoughResizeObserver);
    pageEntities.addGsapAnimation(enoughTimeline);

    initSpinWheel();
}

function initSpinWheel(): void {
    const pageMeta = getPageMeta(document);

    const container = findOrThrow<HTMLElement>('.js-spin');
    const svgWrapper = findOrThrow('.js-spin-svg-wrapper');
    const button = findOrThrow<HTMLElement>('.js-btn-spin');
    const textPath1 = findOrThrow('.js-spin-text-path-1');
    const textPath2 = findOrThrow('.js-spin-text-path-2');

    const pages = getData<SpinWheelData[]>(container, 'pages', parseJson);

    assertIsNotNull(pages);

    // Duplicate the array n times so there are lots of slices.
    const pagesDuplicated: SpinWheelData[] = Array(3).fill(pages).flat();

    const slicesGroup = findOrThrow<SVGGElement>('.js-slices-group');
    const finalSlice = findOrThrow<HTMLElement>('.js-final-slice');

    const cx = 250;
    const cy = 250;
    const r = 160;
    const step = 360 / pagesDuplicated.length;
    const rotationOffset = -90 - step / 2;

    // Generate the slices.
    const slices = pagesDuplicated.map((page, i) => {
        const a1 = ((i * step + rotationOffset) * Math.PI) / 180;
        const a2 = (((i + 1) * step + rotationOffset) * Math.PI) / 180;

        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);

        const pathData = `M ${cx} ${cy}
            L ${x1} ${y1}
            A ${r} ${r} 0 0 1 ${x2} ${y2}
            Z`;

        return new Slice({ pathData, ...page });
    });

    // Set some CSS vars now that we have data.
    setStyles(finalSlice, {
        '--slices': `${slices.length}`,
        '--step': `${step}deg`,
    });

    // Append the slices to the DOM.
    slicesGroup.append(...slices.map((slices) => slices.pathElement));

    // TODO: Find a better solution?
    // We're going to animate the `startOffset` attributes on the text path
    // elements. There's no CSS equivalent unfortunately, but performance
    // seems to be okay, so I'm rolling with it for now.
    const textPathOffsets = {
        path1: 0,
        path2: 0,
    };

    const sticky = new StickyElement(button);
    const splitText = SplitText.create('.js-cooper', { type: 'chars' });

    gsap.set(splitText.chars, { autoAlpha: 0 });

    button.addEventListener('click', (event) => {
        const { spin } = pageState;

        // The ctrl key check is mostly just for testing;
        // it'll allow interruptions and won't redirect.
        if (spin.isSpinning && !event.ctrlKey) return;

        // Clear up previous instance if needed.
        spin.timelineRef && pageEntities.kill(spin.timelineRef);

        spin.isSpinning = true;
        sticky.enabled = false;

        // Pick a random result.
        const sliceIndex = Math.floor(Math.random() * slices.length);
        const slice = slices[sliceIndex];

        const targetAngle = sliceIndex * step;
        const spinMultiplier = 10;
        const finalRotation = 360 * spinMultiplier - targetAngle;
        const spinDurationSeconds = 3;

        setStyles(container, {
            '--colour': slice.colour,
            '--colour-contrast': slice.colourContrast,
        });

        textPath2.innerHTML = slice.name;

        svgWrapper.classList.remove('-coloured');

        const timeline = gsap
            .timeline({
                onComplete: () => {
                    spin.isSpinning = false;
                    sticky.enabled = true;

                    if (!event.ctrlKey) {
                        document.dispatchEvent(
                            new CustomEvent('app:page-request', {
                                detail: slice.href,
                            }),
                        );
                    }
                },
            })
            .set(finalSlice, {
                opacity: 0,
            })
            .set(slicesGroup, {
                svgOrigin: 'center center',
            })
            .fromTo(
                slicesGroup,
                {
                    rotate: 0,
                },
                {
                    rotate: finalRotation,
                    duration: spinDurationSeconds,
                    ease: 'expo.inOut',
                },
            )
            .fromTo(
                textPathOffsets,
                {
                    path1: 25,
                },
                {
                    path1: 75,
                    duration: spinDurationSeconds / 2,
                    ease: 'expo.in',
                    onUpdate: () => {
                        textPath1.setAttribute(
                            'startOffset',
                            `${textPathOffsets.path1}%`,
                        );
                    },
                },
                '<',
            )
            .fromTo(
                textPathOffsets,
                {
                    path2: -75,
                },
                {
                    path2: 25,
                    duration: spinDurationSeconds / 2,
                    ease: 'expo.out',
                    onUpdate: () => {
                        textPath2.setAttribute(
                            'startOffset',
                            `${textPathOffsets.path2}%`,
                        );
                    },
                },
                '>',
            )
            .add(() => {
                svgWrapper.classList.add('-coloured');
            })
            .set(finalSlice, {
                opacity: 1,
            })
            .fromTo(
                finalSlice,
                {
                    '--offset': '0deg',
                },
                {
                    '--offset': `${90 - step / 2}deg`,
                    duration: 1,
                    ease: 'expo.inOut',
                },
            )
            .fromTo(
                splitText.chars,
                {
                    y: 20,
                    skewX: 10,
                    autoAlpha: 0,
                },
                {
                    y: 0,
                    skewX: 0,
                    autoAlpha: 1,
                    duration: 1,
                    stagger: 0.02,
                    ease: 'expo.inOut',
                },
                '<',
            )
            .to({}, { duration: 0.5 });

        spin.timelineRef = pageEntities.addGsapAnimation(timeline);
    });

    const awesomeParticles =
        findOrThrow<HTMLCanvasElement>('.js-spin-particles');

    const particles = new Particles({
        canvas: awesomeParticles,
        colours: [pageMeta.theme.primary],
        maxParticles: 50,
    });

    pageEntities.addTicker((time) => {
        particles.draw(time);
    });

    const particlesResizeObserver = new ResizeObserver(() => {
        particles.resize();
    });

    particlesResizeObserver.observe(awesomeParticles);
}

function createDrawConnectionsFunc(): () => void {
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

export { destroy, init, type SpinWheelData };
