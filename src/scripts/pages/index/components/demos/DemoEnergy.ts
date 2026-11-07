import { assertIsNotNull } from 'bossy-boots';
import { gsap } from 'gsap';
import { findOrThrow, getDevicePixelRatio } from 'spank-my-dom';
import type { PageEntitiesHelper } from '../../../../components/PageEntitiesHelper';
import { degreesToRadians } from '../../../../utils';
import { Demo } from './Demo';

interface ComponentState {
    timelineRef?: symbol;
}

interface Cell {
    angleRadians: number;
    distance: number;
    x: number;
    y: number;
}

const componentState: ComponentState = {};

class DemoEnergy extends Demo {
    private readonly displacementMap: SVGFEDisplacementMapElement;

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private timeline: gsap.core.Timeline | null = null;

    private active = false;

    constructor(private readonly pageEntities: PageEntitiesHelper) {
        const container = findOrThrow<HTMLElement>('.js-demo-energy');

        super(container, pageEntities);

        const filter = findOrThrow<SVGFilterElement>('svg filter', container);
        const turbulence = findOrThrow('feTurbulence', filter);
        const displacementMap = findOrThrow('feDisplacementMap', filter);

        this.displacementMap = displacementMap;

        const canvas = findOrThrow('canvas', container);
        const context = canvas.getContext('2d');

        assertIsNotNull(context);

        context.strokeStyle = 'white';
        context.lineCap = 'round';
        context.lineJoin = 'round';

        this.canvas = canvas;
        this.context = context;

        pageEntities.addGsapTicker(() => {
            if (this.active) {
                turbulence.setAttribute(
                    'baseFrequency',
                    `${Math.random() * 0.1}`,
                );
            }
        });
    }

    public override start(): void {
        this.active = true;
        this.timeline?.play(0);
    }

    public override stop(): void {
        this.timeline?.pause();
        this.active = false;
    }

    public override resize(): void {
        // Clean up previous state.

        this.timeline = null;

        componentState.timelineRef &&
            this.pageEntities.kill(componentState.timelineRef);

        // Initialise.

        const canvas = this.canvas;
        const context = this.context;

        const dpr = getDevicePixelRatio({ max: 2 });
        const canvasRect = canvas.getBoundingClientRect();
        const headingRect = this.headingElement.getBoundingClientRect();

        context.clearRect(0, 0, canvasRect.width, canvasRect.height);
        canvas.width = canvasRect.width * dpr;
        canvas.height = canvasRect.height * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const columnWidth = getColumnSize(canvasRect.width, 80);
        const totalColumns = canvasRect.width / columnWidth;
        const totalRows = Math.floor(canvasRect.height / columnWidth);
        const offsetY = (canvasRect.height - totalRows * columnWidth) / 2;

        const cells: Cell[] = [];

        const size = columnWidth / 2;
        const sizeHalf = size / 2;
        const tipSize = size / 4;

        const renderArrow = () => {
            context.beginPath();
            context.moveTo(-sizeHalf, 0);
            context.lineTo(sizeHalf, 0);
            context.lineTo(sizeHalf - tipSize, -tipSize);
            context.moveTo(sizeHalf, 0);
            context.lineTo(sizeHalf - tipSize, tipSize);
            context.strokeStyle = 'white';
            context.lineWidth = size / 10;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.stroke();
        };

        for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalColumns; c++) {
                const x = columnWidth * c;
                const y = offsetY + columnWidth * r;

                const cellRect = DOMRectReadOnly.fromRect({
                    x: canvasRect.x + x,
                    y: canvasRect.y + y,
                    width: columnWidth,
                    height: columnWidth,
                });

                if (!isIntersecting(headingRect, cellRect)) {
                    const offsetX = x + columnWidth / 2;
                    const offsetY = y + columnWidth / 2;

                    const { angle, distance } = getAngleAndDistance(
                        headingRect,
                        canvasRect,
                        offsetX,
                        offsetY,
                    );

                    cells.push({
                        angleRadians: angle,
                        distance: distance,
                        x: offsetX,
                        y: offsetY,
                    });
                }
            }
        }

        const tweenProps = {
            scale: 0,
            glow: 0,
        };

        const timeline = gsap
            .timeline({
                onUpdate: () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    for (const { angleRadians, x, y } of cells) {
                        context.save();
                        context.translate(x, y);
                        context.rotate(angleRadians);
                        renderArrow();
                        context.restore();
                    }

                    this.headingElement.style.setProperty(
                        '--glow',
                        `${tweenProps.glow}`,
                    );

                    this.displacementMap.setAttribute(
                        'scale',
                        `${tweenProps.scale}`,
                    );
                },
                repeat: -1,
                yoyo: true,
                defaults: {
                    duration: 2,
                    delay: 1,
                    ease: 'expo.out',
                    easeReverse: true,
                },
            })
            .fromTo(
                tweenProps,
                {
                    scale: 0,
                    glow: 0,
                },
                {
                    scale: 15,
                    glow: 1,
                },
                0,
            )
            .fromTo(
                this.headingElement,
                {
                    opacity: 0.9,
                },
                {
                    opacity: 1,
                },
                0,
            )
            .pause();

        for (const cell of cells) {
            timeline.to(
                cell,
                {
                    angleRadians: cell.angleRadians + degreesToRadians(180),
                    ease: 'elastic.out',
                },
                0,
            );
        }

        this.timeline = timeline;

        componentState.timelineRef =
            this.pageEntities.addGsapAnimation(timeline);
    }
}

function getAngleAndDistance(
    headingRect: DOMRect,
    canvasRect: DOMRect,
    x: number,
    y: number,
): { angle: number; distance: number } {
    const targetX = headingRect.left + headingRect.width / 2 - canvasRect.left;

    const targetY = headingRect.top + headingRect.height / 2 - canvasRect.top;

    const dx = targetX - x;
    const dy = targetY - y;

    return {
        angle: Math.atan2(-dy, -dx), // Negative to point away.
        distance: Math.hypot(dx, dy),
    };
}

function getColumnSize(containerWidth: number, maxSize: number) {
    const columns = Math.floor(containerWidth / maxSize);

    return columns > 0 ? containerWidth / columns : containerWidth;
}

function isIntersecting(rectA: DOMRect, rectB: DOMRect): boolean {
    return (
        rectA.left < rectB.right &&
        rectA.right > rectB.left &&
        rectA.top < rectB.bottom &&
        rectA.bottom > rectB.top
    );
}

export { DemoEnergy };
