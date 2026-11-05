import RAPIER from '@dimforge/rapier2d-compat';
import { assertIsNotNull } from 'bossy-boots';
import { arrayOf, findOrThrow, pickRandom } from 'spank-my-dom';
import heartSVGRaw from '../../../../../images/heart.svg?raw';
import type { PageEntitiesHelper } from '../../../../components/PageEntitiesHelper';
import { Demo } from './Demo';

interface ComponentState {
    tickerRef?: symbol;
    worldRef?: symbol;
}

const componentState: ComponentState = {};
const parser = new DOMParser();
const serializer = new XMLSerializer();

const HEART_SCALE_FACTOR = 0.9;
const HEART_COUNT = 50;
const HEART_SIZE = 60;

const HEART_COLOURS = [
    '#ffc8e4',
    '#bee6c2',
    '#c7b8dc',
    '#b7e2f4',
    '#fdf8b8',
    '#f9c4b4',
    '#f1f1f1',
];

interface MakeHeartSVGOptions {
    lines: string[];
    fontSize?: number;
    gap?: number;
    offsetY?: number;
}

function makeHeartSVG(options: MakeHeartSVGOptions): HTMLImageElement {
    const { lines, fontSize = 6, gap = 0, offsetY = 11 } = options;

    const doc = parser.parseFromString(heartSVGRaw, 'image/svg+xml');
    const textElement = findOrThrow('text', doc);

    textElement.setAttribute('y', `${offsetY}`);
    textElement.setAttribute('font-size', `${fontSize}`);

    const lineElements = lines.reduce<SVGTSpanElement[]>((acc, line, i) => {
        const tspan = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'tspan',
        );

        tspan.textContent = line;
        tspan.setAttribute('x', '12');
        tspan.setAttribute('dy', `${i * gap}`);

        acc.push(tspan);

        return acc;
    }, []);

    textElement.append(...lineElements);

    const blob = new Blob([serializer.serializeToString(doc)], {
        type: 'image/svg+xml;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.src = url;

    // Revoke regardless of outcome.
    image.decode().finally(() => URL.revokeObjectURL(url));

    return image;
}

const heartImages: HTMLImageElement[] = [
    makeHeartSVG({
        lines: ['love', 'you'],
        fontSize: 5,
        gap: 4,
        offsetY: 9.5,
    }),
    makeHeartSVG({
        lines: ['text', 'me'],
        fontSize: 5,
        gap: 4,
        offsetY: 9.5,
    }),
    makeHeartSVG({
        lines: ['flash'],
    }),
    makeHeartSVG({
        lines: ['CSS'],
    }),
    makeHeartSVG({
        lines: ['JS'],
    }),
    makeHeartSVG({
        lines: ['lamp'],
    }),
];

function createPhysicsWorld(container: HTMLElement): RAPIER.World {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const wallThickness = 100;
    const wallRestitution = 0.8;
    const world = new RAPIER.World({ x: 0, y: -9.81 * 100 });

    world.createCollider(
        RAPIER.ColliderDesc.cuboid(wallThickness / 2, height / 2)
            .setTranslation(width + wallThickness / 2, height / 2)
            .setRestitution(wallRestitution),
    );

    world.createCollider(
        RAPIER.ColliderDesc.cuboid(width / 2, wallThickness / 2)
            .setTranslation(width / 2, -wallThickness / 2)
            .setRestitution(wallRestitution),
    );

    world.createCollider(
        RAPIER.ColliderDesc.cuboid(wallThickness / 2, height / 2)
            .setTranslation(-wallThickness / 2, height / 2)
            .setRestitution(wallRestitution),
    );

    return world;
}

class Heart {
    public readonly body: RAPIER.RigidBody;
    public readonly heartImage: OffscreenCanvas;

    //public readonly radius = 60;
    public readonly colour = pickRandom(HEART_COLOURS);

    constructor(
        world: RAPIER.World,
        private containerRect: DOMRect,
    ) {
        const offscreen = new OffscreenCanvas(
            HEART_SIZE * 2 * HEART_SCALE_FACTOR,
            HEART_SIZE * 2 * HEART_SCALE_FACTOR,
        );

        const offscreenContext = offscreen.getContext('2d');

        assertIsNotNull(offscreenContext);

        offscreenContext.drawImage(
            pickRandom(heartImages),
            0,
            0,
            offscreen.width,
            offscreen.height,
        );

        this.heartImage = offscreen;

        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setRotation(0)
                .setCcdEnabled(false)
                .setCanSleep(true)
                .setLinearDamping(0.1)
                .setAngularDamping(0.1),
        );

        this.body = body;

        world.createCollider(
            RAPIER.ColliderDesc.ball(HEART_SIZE)
                .setRestitution(0.8)
                .setFriction(0.5),
            body,
        );
    }

    public reset(): void {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1000;

        this.body.setTranslation(
            {
                x:
                    HEART_SIZE +
                    Math.random() * (this.containerRect.width - HEART_SIZE * 2),
                y:
                    HEART_SIZE +
                    this.containerRect.height +
                    Math.random() *
                        (this.containerRect.height - HEART_SIZE * 2),
            },
            true,
        );

        this.body.setLinvel(
            {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
            },
            true,
        );

        this.body.setAngvel((Math.random() - 0.5) * 10, true);
    }
}

class DemoHearts extends Demo {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly gradient: CanvasGradient;
    private hearts?: Set<Heart>;

    private active = false;

    public ready: Promise<void>;

    constructor(private readonly pageEntities: PageEntitiesHelper) {
        const container = findOrThrow<HTMLElement>('.js-demo-hearts');

        super(container, pageEntities);

        const canvas = findOrThrow('canvas', container);
        const context = canvas.getContext('2d');

        assertIsNotNull(context);

        this.canvas = canvas;
        this.context = context;

        const gradient = this.context.createLinearGradient(
            0,
            0,
            HEART_SIZE,
            HEART_SIZE,
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');

        this.gradient = gradient;

        this.ready = new Promise((resolve) => {
            (async () => {
                await Promise.all([
                    RAPIER.init(),
                    ...heartImages.map((x) => x.decode()),
                ]);
                resolve();
            })();
        });
    }

    public override start(): void {
        this.hearts?.forEach((heart) => {
            heart.reset();
        });

        this.active = true;
    }

    public override stop(): void {
        this.active = false;
    }

    public override resize(): void {
        // Clean up previous state.

        this.hearts?.clear();

        componentState.tickerRef &&
            this.pageEntities.kill(componentState.tickerRef);

        componentState.worldRef &&
            this.pageEntities.kill(componentState.worldRef);

        // Initialise.

        const canvasRect = this.canvas.getBoundingClientRect();
        const world = createPhysicsWorld(this.canvas);

        this.canvas.width = canvasRect.width;
        this.canvas.height = canvasRect.height;

        componentState.worldRef = this.pageEntities.addRapierWorld(world);

        const hearts = arrayOf(HEART_COUNT, () => new Heart(world, canvasRect));

        this.hearts = new Set(hearts);

        const headingRect = this.headingElement.getBoundingClientRect();

        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed()
                .setTranslation(canvasRect.width / 2, canvasRect.height / 2)
                .setLinearDamping(0.1)
                .setAngularDamping(0.1),
        );

        world.createCollider(
            RAPIER.ColliderDesc.cuboid(
                headingRect.width / 2,
                headingRect.height / 2,
            )
                .setRestitution(0.8)
                .setFriction(0.2),
            body,
        );

        componentState.tickerRef = this.pageEntities.addGsapTicker(() => {
            if (!this.active) return;

            const context = this.context;

            world.step();

            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.lineWidth = 6;

            for (const heart of hearts) {
                const size = HEART_SIZE * HEART_SCALE_FACTOR;
                const translation = heart.body.translation();
                const angle = heart.body.rotation();

                context.save();

                context.fillStyle = heart.colour;
                context.strokeStyle = this.gradient;

                context.translate(translation.x, translation.y);

                context.beginPath();
                context.arc(0, 0, HEART_SIZE, 0, 2 * Math.PI);
                context.fill();
                context.clip();
                context.stroke();

                context.rotate(-angle);

                context.drawImage(
                    heart.heartImage,
                    -size,
                    -size,
                    size * 2,
                    size * 2,
                );

                context.restore();
            }
        });
    }
}

export { DemoHearts };
