import { assertIsNotNull } from 'bossy-boots';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/all';
import {
    arrayOf,
    findAll,
    findOrThrow,
    getData,
    parseJson,
    randomInt,
    setStyles,
} from 'spank-my-dom';
import type { Route } from '../../../config/runtime';
import { IntervalTimer } from '../../components/IntervalTimer';
import { PageEntitiesHelper } from '../../components/PageEntitiesHelper';
import { Path } from '../../components/Path';
import { Particles } from '../../components/particles';
import { StickyElement } from '../../components/StickyElements';
import type { State } from '../../layouts/DefaultLayout';
import { getPageMeta } from '../../utils';
import type { Demo } from './components/demos/Demo';
import { DemoEnergy } from './components/demos/DemoEnergy';
import { DemoHearts } from './components/demos/DemoHearts';
import { DemoPaint } from './components/demos/DemoPaint';
import { DemoTypographic } from './components/demos/DemoTypographic';
import { Slice } from './components/Slice';

interface SpinWheelData {
    name: string;
    route: Route;
    colour: string;
    colourContrast: string;
}

interface PageState {
    tldr: {
        timelineRef?: symbol;
    };
    keywords: {
        timelineRef?: symbol;
    };
    enough: {
        circleTimelineRef?: symbol;
        scribbleTimelineRed?: symbol;
    };
    spin: {
        timelineRef?: symbol;
        isSpinning: boolean;
    };
}

const pageState: PageState = {
    tldr: {},
    keywords: {},
    enough: {},
    spin: {
        isSpinning: false,
    },
};

const pageEntities = new PageEntitiesHelper();

function init(state: State): void {
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

    initTLDRSection();
    initKeywords();
    initDemosSection();
    initSeenEnoughSection();
    initSpinWheel(state);
}

async function initDemosSection(): Promise<void> {
    const container = findOrThrow('.js-demos');
    const demoHearts = new DemoHearts(pageEntities);

    await demoHearts.ready;

    const demos = [
        new DemoPaint(pageEntities),
        new DemoTypographic(pageEntities),
        new DemoEnergy(pageEntities),
        demoHearts,
    ] satisfies Demo[];

    let activeIndex = randomInt(0, demos.length);

    const timer = new IntervalTimer({
        delay: 5000,
        onInterval: async () => {
            const demo = demos[activeIndex];

            activeIndex = activeIndex + 1 >= demos.length ? 0 : ++activeIndex;

            const nextDemo = demos[activeIndex];

            await demo.transitionOut();
            demo.stop();

            nextDemo.start();
            await nextDemo.transitionIn();
        },
    });

    pageEntities.add(timer, {
        onKill: (ref) => {
            ref.pause();
        },
    });

    const intersectionObserver = new IntersectionObserver(async ([entry]) => {
        if (entry.isIntersecting) {
            const demo = demos[activeIndex];

            timer.start();
            demo.start();
            demo.transitionIn(true);
        } else {
            timer.pause();

            demos.forEach(async (demo) => {
                demo.transitionOut(true);
                demo.stop();
            });
        }
    });

    intersectionObserver.observe(container);
    pageEntities.addObserver(intersectionObserver);

    const resizeObserver = new ResizeObserver(() => {
        timer.reset();

        demos.forEach((demo) => {
            demo.stop();
            demo.resize();
        });

        demos[activeIndex].start();
    });

    resizeObserver.observe(container);
    pageEntities.addObserver(resizeObserver);
}

function initKeywords(): void {
    const keywords = findOrThrow('.js-keywords');
    const lines = findAll('.js-keywords-line', keywords);

    const resizeObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        const { timelineRef } = pageState.keywords;

        timelineRef && pageEntities.kill(timelineRef);

        // Create new state.

        const keywordsWidth = keywords.getBoundingClientRect().width;

        const keywordsTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: keywords,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.5,
            },
            defaults: {
                ease: 'none',
            },
        });

        lines.forEach((line, i) => {
            const wordsBefore = findOrThrow('span:first-child', line);
            const wordsAfter = findOrThrow('span:last-child', line);
            const isEven = i % 2 === 0;

            const lineWidth = line.getBoundingClientRect().width;
            const beforeWidth = wordsBefore.getBoundingClientRect().width;
            const afterWidth = wordsAfter.getBoundingClientRect().width;

            const compensation = keywordsWidth / 2 - lineWidth / 2;
            const offset = Math.min(beforeWidth, afterWidth) - compensation;

            keywordsTimeline.fromTo(
                line,
                {
                    x: isEven ? offset : -offset,
                },
                {
                    x: isEven ? -offset : offset,
                },
                0,
            );
        });

        pageState.keywords.timelineRef =
            pageEntities.addGsapAnimation(keywordsTimeline);
    });

    resizeObserver.observe(keywords);
    pageEntities.addObserver(resizeObserver);
}

function initTLDRSection(): void {
    const tldrSvg = findOrThrow<SVGSVGElement>('.js-tldr-svg');
    const tldrPaths = findAll('path', tldrSvg);

    const resizeObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        const { timelineRef } = pageState.tldr;

        timelineRef && pageEntities.kill(timelineRef);

        // Initialise section.

        const pathInstances = tldrPaths.map((path) => new Path(path));

        const tldrTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: tldrSvg,
                scrub: true,
                start: 'top bottom',
                end: 'center center',
            },
            defaults: {
                ease: 'none',
            },
        });

        pathInstances.forEach((path) => {
            tldrTimeline.fromTo(
                path,
                {
                    strokePosition: path.getPathLengthAtPercent(0),
                },
                {
                    strokePosition: path.getPathLengthAtPercent(100),
                },
                '<',
            );
        });

        pageState.tldr.timelineRef =
            pageEntities.addGsapAnimation(tldrTimeline);
    });

    resizeObserver.observe(tldrSvg);
    pageEntities.addObserver(resizeObserver);
}

function initSeenEnoughSection(): void {
    // SVG connections.

    const drawConnections = createDrawConnectionsFunc();
    const connections = findOrThrow('.js-connections');

    const enoughResizeObserver = new ResizeObserver(() => {
        drawConnections();
    });

    enoughResizeObserver.observe(connections);
    pageEntities.addObserver(enoughResizeObserver);

    // Freehand SVG illustrations.

    const circleSvg = findOrThrow<SVGSVGElement>('.js-circle-svg');
    const circleSvgPath = findOrThrow('path', circleSvg);

    const circleObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        const { circleTimelineRef } = pageState.enough;

        circleTimelineRef && pageEntities.kill(circleTimelineRef);

        // Create new state.

        const path = new Path(circleSvgPath);

        const timeline = gsap
            .timeline({
                scrollTrigger: {
                    trigger: '.js-routes',
                    start: 'bottom bottom',
                    toggleActions: 'play none none reverse',
                },
                defaults: {
                    duration: 1,
                    ease: 'steps(20)',
                },
            })
            .fromTo(
                path,
                {
                    strokePosition: path.getPathLengthAtPercent(0),
                },
                {
                    strokePosition: path.getPathLengthAtPercent(100),
                },
            );

        pageState.enough.circleTimelineRef =
            pageEntities.addGsapAnimation(timeline);
    });

    circleObserver.observe(circleSvg);

    const scribbleSvg = findOrThrow<SVGSVGElement>('.js-scribble-svg');
    const scribbleSvgPath = findOrThrow('path', scribbleSvg);

    const scribbleObserver = new ResizeObserver(() => {
        // Initial clean up from previous state.

        const { scribbleTimelineRed } = pageState.enough;

        scribbleTimelineRed && pageEntities.kill(scribbleTimelineRed);

        // Create new state.

        const path = new Path(scribbleSvgPath);

        const timeline = gsap
            .timeline({
                scrollTrigger: {
                    trigger: '.js-routes',
                    start: 'bottom bottom',
                    toggleActions: 'play none none reverse',
                },
                defaults: {
                    duration: 1,
                    ease: 'steps(20)',
                },
            })
            .fromTo(
                path,
                {
                    strokePosition: path.getPathLengthAtPercent(0),
                },
                {
                    strokePosition: path.getPathLengthAtPercent(100),
                },
            );

        pageState.enough.scribbleTimelineRed =
            pageEntities.addGsapAnimation(timeline);
    });

    scribbleObserver.observe(scribbleSvg);
}

function initSpinWheel(state: State): void {
    const pageMeta = getPageMeta(document);

    const container = findOrThrow<HTMLElement>('.js-spin');
    const svgWrapper = findOrThrow('.js-spin-svg-wrapper');
    const button = findOrThrow<HTMLElement>('.js-btn-spin');
    const textPath1 = findOrThrow('.js-spin-text-path-1');
    const textPath2 = findOrThrow('.js-spin-text-path-2');

    const pages = getData<SpinWheelData[]>(container, 'pages', parseJson);

    assertIsNotNull(pages);

    // Duplicate the array n times so there are lots of slices.
    const pagesDuplicated = arrayOf(3, pages).flat();

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
                        state.loadPage(slice.route);
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
