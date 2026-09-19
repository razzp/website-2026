import { assertIsNotNull, assertIsNotUndefined, guarantee } from 'bossy-boots';

class Path {
    private readonly pathCTM: DOMMatrix;
    //private readonly parentSVG: SVGSVGElement;

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
        //const parentSVG = path.closest('svg');

        assertIsNotNull(pathCTM);
        assertIsNotUndefined(pathLength);
        //assertIsNotNull(parentSVG);

        const pathLengthScaled = parseFloat(pathLength) * pathCTM.a;

        this.pathCTM = pathCTM;
        this.pathLength = pathLengthScaled;
        //this.parentSVG = parentSVG;
    }

    private render(): void {
        this.path.style.strokeDasharray = `${this.pathLength}`;
        this.path.style.strokeDashoffset = `${this.pathLength - this.strokePosition}`;
    }

    public getPathLengthAtPercent(value: number): number {
        return (this.pathLength / 100) * value;
    }

    /*public getCurrentPoint(): DOMPoint {
        const screenCTM = this.path.getScreenCTM();

        assertIsNotNull(screenCTM);

        return this.path
            .getPointAtLength(this.strokePosition / this.pathCTM.a)
            .matrixTransform(screenCTM);
    }*/

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
