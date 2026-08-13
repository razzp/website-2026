import { assertIsNotNull } from 'bossy-boots';

const EPSILON = 0.01;

class Particle {
    private onDeath?: (particle: Particle) => void;

    private vx = (Math.random() - 0.5) * 0.5;
    private vy = (Math.random() - 0.5) * 0.5;
    private birth = performance.now();
    private lifetime = 1000 + Math.random() * 3000;
    private rotationSpeed = (Math.random() - 0.5) * 0.05;

    public x: number;
    public y: number;
    public colour: string;

    public alpha = 1;
    public rotation = Math.random() * Math.PI * 2;
    public size = 5 + Math.random() * 10;

    constructor({
        canvas,
        colours,
        onDeath,
    }: {
        canvas: HTMLCanvasElement;
        colours: string[];
        onDeath?: (particle: Particle) => void;
    }) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.colour = getRandomColour(colours);
        this.onDeath = onDeath;
    }

    public draw(context: CanvasRenderingContext2D): void {
        const thickness = 2;
        const length = this.size;

        context.globalAlpha = this.alpha;
        context.fillStyle = this.colour;

        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.fillRect(-length / 2, -thickness / 2, length, thickness);
        context.fillRect(-thickness / 2, -length / 2, thickness, length);
        context.restore();
    }

    public tick(time: DOMHighResTimeStamp): void {
        const age = time - this.birth;
        const progress = age / this.lifetime;
        const alpha = Math.max(0, 1 - progress);

        if (Math.abs(alpha) < EPSILON) {
            return void this.onDeath?.(this);
        }

        this.x += this.vx;
        this.y += this.vy;
        this.alpha = alpha;
        this.rotation += this.rotationSpeed;
    }
}

class Particles {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private colours: string[];
    private maxParticles: number;

    private particles = new Set<Particle>();

    constructor({
        canvas,
        colours,
        maxParticles,
    }: {
        canvas: HTMLCanvasElement;
        colours: string[];
        maxParticles: number;
    }) {
        const context = canvas.getContext('2d');

        assertIsNotNull(context);

        this.canvas = canvas;
        this.context = context;
        this.colours = colours;
        this.maxParticles = maxParticles;
        this.resize();
    }

    private clearContext(): void {
        const { width, height } = this.canvas;

        this.context.clearRect(0, 0, width, height);
    }

    public resize(): void {
        const { width, height } = this.canvas.getBoundingClientRect();

        this.canvas.width = width;
        this.canvas.height = height;
        this.clearContext();
        this.particles.clear();
    }

    public draw(time: number): void {
        this.clearContext();

        for (let i = 0; i < this.maxParticles - this.particles.size; i++) {
            this.particles.add(
                new Particle({
                    canvas: this.canvas,
                    colours: this.colours,
                    onDeath: (particle) => {
                        this.particles.delete(particle);
                    },
                }),
            );
        }

        for (const particle of this.particles) {
            particle.tick(time);
            particle.draw(this.context);
        }

        this.context.globalAlpha = 1;
    }
}

function getRandomColour(colours: string[]): string {
    return colours[Math.floor(Math.random() * colours.length)];
}

export { Particles };
