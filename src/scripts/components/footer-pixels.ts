function generateFooterPixels(canvas: HTMLCanvasElement, colour: string): void {
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.clientWidth;
    const maxSquareSize = 20;
    const rows = 12;
    const columns = Math.ceil(width / maxSquareSize);
    const columnSize = Math.round(width / columns);

    canvas.width = width;
    canvas.height = rows * columnSize;

    ctx.fillStyle = colour;

    for (let i = 0; i < rows; i++) {
        const probability = mapRange(i, 0, rows - 1, 90, 10);

        let lastX = 0;

        calculateColumnWidths(width, 20).forEach((x) => {
            if (chance(probability)) {
                ctx.fillRect(lastX, columnSize * i, x, columnSize);
            }

            lastX += x;
        });
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

export { generateFooterPixels };
