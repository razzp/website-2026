import { assertIsNotNull, assertIsNotUndefined } from 'bossy-boots';

class Path {
    private readonly pathCTM: DOMMatrix;

    public readonly pathLength: number;

    readonly #state = {
        strokePosition: 0,
    };

    constructor(
        public readonly path: SVGPathElement,
        private readonly svg: SVGSVGElement,
    ) {
        const pathCTM = path.getCTM();
        const pathLength = path.dataset.pathLength;

        assertIsNotNull(pathCTM);
        assertIsNotUndefined(pathLength);

        const pathLengthScaled = parseFloat(pathLength) * pathCTM.a;

        this.pathCTM = pathCTM;
        this.pathLength = pathLengthScaled;
    }

    private render(): void {
        this.path.style.strokeDasharray = `${this.pathLength}`;
        this.path.style.strokeDashoffset = `${this.pathLength - this.strokePosition}`;
    }

    public getPathLengthAtPercent(value: number): number {
        return (this.pathLength / 100) * value;
    }

    public getCurrentPoint(): DOMPointReadOnly {
        const screenCTM = this.path.getScreenCTM();

        assertIsNotNull(screenCTM);

        const screenPoint = this.path
            .getPointAtLength(this.strokePosition / this.pathCTM.a)
            .matrixTransform(screenCTM);

        const svgRect = this.svg.getBoundingClientRect();

        const x = svgRect.left + svgRect.width / 2 - screenPoint.x;
        const y = svgRect.top + svgRect.height / 2 - screenPoint.y;

        return new DOMPointReadOnly(x, y);
    }

    private get strokePosition(): number {
        return this.#state.strokePosition;
    }

    private set strokePosition(value: number) {
        this.#state.strokePosition = value;
        this.render();
    }
}

export { Path };
