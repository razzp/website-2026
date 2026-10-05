import { assertIsNotNull } from 'bossy-boots';
import { getDevicePixelRatio } from '../../utils';

const COUNT = 100;
const EDGE_WIDTH = 20;

function createDecorativeFrame(
    element: HTMLElement,
    colours: string[],
): () => void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    assertIsNotNull(context);

    canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';

    element.appendChild(canvas);

    return () => {
        const dpr = getDevicePixelRatio();

        // Clear the canvas in case this is being called again.
        context.clearRect(0, 0, canvas.width, canvas.height);

        const { width, height } = element.getBoundingClientRect();

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        for (let i = 0; i < COUNT; i++) {
            let x: number;
            let y: number;

            // Pick a random edge.
            const edge = Math.floor(Math.random() * 4);

            if (edge === 0) {
                // Top.
                x = Math.random() * canvas.width;
                y = Math.random() * EDGE_WIDTH;
            } else if (edge === 1) {
                // Right.
                x = canvas.clientWidth - Math.random() * EDGE_WIDTH;
                y = Math.random() * canvas.clientHeight;
            } else if (edge === 2) {
                // Bottom
                x = Math.random() * canvas.clientWidth;
                y = canvas.clientHeight - Math.random() * EDGE_WIDTH;
            } else {
                // left.
                x = Math.random() * EDGE_WIDTH;
                y = Math.random() * canvas.clientHeight;
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
