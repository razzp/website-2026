import type { Route } from '../../../../config/runtime';

interface Options {
    pathData: string;
    name: string;
    route: Route;
    colour: string;
    colourContrast: string;
}

class Slice {
    public readonly pathElement: SVGPathElement;
    public readonly colour: string;
    public readonly colourContrast: string;
    public readonly name: string;
    public readonly route: Route;

    constructor(options: Options) {
        const { pathData, colour, colourContrast, name, route } = options;

        const path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path',
        );

        path.setAttribute('d', pathData);
        path.setAttribute('fill', colour);

        this.pathElement = path;
        this.colour = colour;
        this.colourContrast = colourContrast;
        this.name = name;
        this.route = route;
    }
}

export { Slice };
