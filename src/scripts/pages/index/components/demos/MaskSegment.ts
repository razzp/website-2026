class MaskSegment {
    public readonly commands: string[];

    #progress = 0;

    constructor(
        private readonly element: HTMLElement,
        total: number,
        private readonly index: number,
    ) {
        const y = `calc(var(--segment-${index}, 1) * 1%)`;

        this.commands = [
            `line to ${(100 / total) * index}% ${y}`,
            `line to ${(100 / total) * (index + 1)}% ${y}`,
            `line to ${(100 / total) * (index + 1)}% 100%`,
        ];
    }

    public set progress(value: number) {
        this.#progress = value;
        this.element.style.setProperty(
            `--segment-${this.index}`,
            `${value * 100}`,
        );
    }

    public get progress(): number {
        return this.#progress;
    }
}

export { MaskSegment };
