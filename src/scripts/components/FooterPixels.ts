import { assertIsNotNull } from 'bossy-boots';
import { findOrThrow, getDevicePixelRatio } from 'spank-my-dom';
import { defineBreakpoints } from '../utils';

const ROWS = 12;

const getMaxSquareSize = defineBreakpoints({
    base: 10,
    lg: 20,
});

class FooterPixels {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private colour = '#fff';

    constructor() {
        const canvas = findOrThrow<HTMLCanvasElement>('.js-footer-pixels');
        const context = canvas.getContext('2d');

        assertIsNotNull(context);

        this.canvas = canvas;
        this.context = context;

        new ResizeObserver(() => {
            this.resize();
        }).observe(canvas);
    }

    public resize(): void {
        const { width } = this.canvas.getBoundingClientRect();
        const dpr = getDevicePixelRatio({ round: 'up' });
        const maxSquareSize = getMaxSquareSize();

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const columns = Math.ceil(width / maxSquareSize);
        const columnSize = Math.round(width / columns);

        this.canvas.width = width * dpr;
        this.canvas.height = ROWS * columnSize * dpr;
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.context.fillStyle = this.colour;

        for (let i = 0; i < ROWS; i++) {
            const probability = mapRange(i, 0, ROWS - 1, 90, 10);

            let lastX = 0;

            calculateColumnWidths(width, maxSquareSize).forEach((x) => {
                if (chance(probability)) {
                    this.context.fillRect(lastX, columnSize * i, x, columnSize);
                }

                lastX += x;
            });
        }
    }

    public setColour(colour: string): void {
        this.colour = colour;
        this.resize();
    }
}

function calculateColumnWidths(
    containerWidth: number,
    maxColumnWidth: number,
): number[] {
    const columns = Math.max(1, Math.floor(containerWidth / maxColumnWidth));
    const baseWidth = Math.floor(containerWidth / columns);
    const leftover = containerWidth % columns;

    return Array.from(
        { length: columns },
        (_, i) => baseWidth + (i < leftover ? 1 : 0),
    );
}

function chance(percent: number): boolean {
    return Math.random() * 100 < percent;
}

function mapRange(
    value: number,
    oldMin: number,
    oldMax: number,
    newMin: number,
    newMax: number,
): number {
    return newMin + ((value - oldMin) * (newMax - newMin)) / (oldMax - oldMin);
}

export { FooterPixels };
