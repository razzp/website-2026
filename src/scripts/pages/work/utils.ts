import { assertIsNotNull } from 'bossy-boots';

function createDecorativeFrame(
    element: HTMLElement,
    colours: string[],
): () => void {
    const count = 100;
    const edgeWidth = 20;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    assertIsNotNull(context);

    canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';

    element.appendChild(canvas);

    return () => {
        // Clear the canvas in case this is being called again.
        context.clearRect(0, 0, canvas.width, canvas.height);

        const rect = element.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;

        for (let i = 0; i < count; i++) {
            let x: number;
            let y: number;

            // Pick a random edge.
            const edge = Math.floor(Math.random() * 4);

            if (edge === 0) {
                // Top.
                x = Math.random() * canvas.width;
                y = Math.random() * edgeWidth;
            } else if (edge === 1) {
                // Right.
                x = canvas.width - Math.random() * edgeWidth;
                y = Math.random() * canvas.height;
            } else if (edge === 2) {
                // Bottom
                x = Math.random() * canvas.width;
                y = canvas.height - Math.random() * edgeWidth;
            } else {
                // left.
                x = Math.random() * edgeWidth;
                y = Math.random() * canvas.height;
            }

            const size = 10 + Math.random() * 100;
            const rotation = Math.random() * Math.PI * 2;
            const colour = colours[Math.floor(Math.random() * colours.length)];

            context.save();

            context.strokeStyle = colour;
            context.lineWidth = 5 + Math.random() * 20;
            context.lineCap = 'round';

            context.translate(x, y);
            context.rotate(rotation);
            context.beginPath();

            // Horizontal stroke.
            context.moveTo(-size, 0);
            context.lineTo(size, 0);

            // Vertical stroke.
            context.moveTo(0, -size);
            context.lineTo(0, size);

            context.stroke();
            context.restore();
        }
    };
}

export { createDecorativeFrame };
