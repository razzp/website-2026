import { gsap } from 'gsap';
import { findOrThrow } from 'spank-my-dom';
import type { PageEntitiesHelper } from '../../../../components/PageEntitiesHelper';
import { Demo } from './Demo';

interface ComponentState {
    timelineRef?: symbol;
}

const MAX_OFFSET = 200;

const componentState: ComponentState = {};

class DemoTypographic extends Demo {
    private textElement: HTMLElement;

    private elements = new Set<Element>();
    private timeline: gsap.core.Timeline | null = null;

    constructor(private readonly pageEntities: PageEntitiesHelper) {
        const container = findOrThrow<HTMLElement>('.js-demo-typographic');

        super(container, pageEntities);

        const template = findOrThrow('template', container).content;
        const textElement = findOrThrow('span', template);

        textElement.innerHTML = this.headingElement.innerHTML;
        this.textElement = textElement;
    }

    public override start(): void {
        this.timeline?.play(0);
    }

    public override stop(): void {
        this.timeline?.pause();
    }

    public override resize(): void {
        // Clear up previous state.

        this.timeline = null;

        componentState.timelineRef &&
            this.pageEntities.kill(componentState.timelineRef);

        this.elements.forEach((element) => {
            element.remove();
        });

        this.elements.clear();

        // Initialise.

        const { width: headingWidth, height: headingHeight } =
            this.headingElement.getBoundingClientRect();

        const { width: containerWidth, height: containerHeight } =
            this.container.getBoundingClientRect();

        const totalColumns = roundUpToEven(
            (containerWidth - headingWidth) / headingWidth,
        );

        const totalRows = roundDownToEven(
            (containerHeight - headingHeight) / headingHeight,
        );

        const rowMidIndex = totalRows / 2;
        const columnMidIndex = totalColumns / 2;
        const elementsByRow = new Map<number, HTMLElement[]>();

        for (let r = 0; r <= totalRows; r++) {
            const row = elementsByRow.getOrInsert(r, []);

            for (let c = 0; c <= totalColumns; c++) {
                // Ignore the cell taken up by the main heading.
                if (c === columnMidIndex && r === rowMidIndex) continue;

                const element = clone(this.textElement);

                element.style.setProperty(
                    'top',
                    `${(-rowMidIndex + r) * 100}%`,
                );

                element.style.setProperty(
                    'left',
                    `${(-columnMidIndex + c) * 100}%`,
                );

                row.push(element);
                this.elements.add(element);
            }
        }

        const rows = [...elementsByRow.values()];

        const rowsBefore = rows
            .slice(0, Math.floor(elementsByRow.size / 2))
            .reverse();

        const rowsAfter = rows.slice(Math.ceil(elementsByRow.size / 2));
        const timeline = gsap.timeline().pause();

        const add = (elements: HTMLElement[], offset: number) => {
            timeline.fromTo(
                elements,
                {
                    x: offset,
                },
                {
                    x: -offset,
                    duration: 6, // Interval + Transition Duration
                    ease: 'none',
                },
                0,
            );
        };

        rowsBefore.forEach((elements, i, { length }) => {
            add(elements, (i + 1) * (MAX_OFFSET / length));
        });

        rowsAfter.forEach((elements, i, { length }) => {
            add(elements, 0 - (i + 1) * (MAX_OFFSET / length));
        });

        this.headingElement.append(...rows.flat());
        this.timeline = timeline;

        componentState.timelineRef =
            this.pageEntities.addGsapAnimation(timeline);
    }
}

function clone<T extends Node>(node: T): T {
    return node.cloneNode(true) as T;
}

function roundUpToEven(value: number): number {
    return Math.ceil(value / 2) * 2;
}

function roundDownToEven(value: number): number {
    return Math.floor(value / 2) * 2;
}

export { DemoTypographic };
