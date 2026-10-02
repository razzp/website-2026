class Slice {
    public readonly pathElement: SVGPathElement;
    public readonly colour: string;
    public readonly colourContrast: string;
    public readonly name: string;
    public readonly href: string;

    constructor(options: {
        pathData: string;
        name: string;
        href: string;
        colour: string;
        colourContrast: string;
    }) {
        const { pathData, colour, colourContrast, name, href } = options;

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
        this.href = href;
    }
}

export { Slice };
