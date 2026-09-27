import { gsap } from 'gsap';
import { findAll } from 'spank-my-dom';
import { mouseEventOnly } from '../utils';

const SPEED = 25;
const DAMPING = 0.4;

class StickyElements {
    private readonly instances: StickyElement[];

    constructor(selectors: string) {
        this.instances = findAll<HTMLElement>(selectors).map(
            (element) => new StickyElement(element),
        );
    }

    public kill(): void {
        this.instances.forEach((instance) => {
            instance.kill();
        });
    }
}

class StickyElement {
    private readonly intersectionObserver: IntersectionObserver;
    private readonly resizeObserver: ResizeObserver;
    private animationOut?: gsap.core.Animation;

    private readonly controller = new AbortController();
    private isIntersecting = false;
    private isInteracting = false;
    private isTweening = false;
    private lastTime: number | null = null;
    private currentRequestId: number | null = null;

    private originX = 0;
    private originY = 0;

    private targetX = 0;
    private targetY = 0;

    private x = 0;
    private y = 0;

    constructor(private readonly element: HTMLElement) {
        this.resize();

        this.intersectionObserver = new IntersectionObserver(([entry]) => {
            this.isIntersecting = entry.isIntersecting;
        });

        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });

        this.intersectionObserver.observe(element);
        this.resizeObserver.observe(element);

        const render = (time: number) => {
            if (!this.isInteracting && !this.isTweening) {
                this.lastTime = null;
                return;
            }

            this.lastTime ??= time;

            if (this.isInteracting) {
                const delta = (time - this.lastTime) / 1000;
                const smoothing = 1 - Math.exp(-SPEED * delta);

                this.x += (this.targetX - this.x) * smoothing;
                this.y += (this.targetY - this.y) * smoothing;
            }

            element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;

            this.lastTime = time;
            this.currentRequestId = requestAnimationFrame(render);
        };

        element.addEventListener(
            'pointerenter',
            mouseEventOnly(() => {
                this.animationOut?.kill();
                this.isInteracting = true;
                this.currentRequestId = requestAnimationFrame(render);
            }),
            { passive: true, signal: this.controller.signal },
        );

        element.addEventListener(
            'pointermove',
            mouseEventOnly((event) => {
                const mouseX = event.clientX - this.originX;
                const mouseY = event.clientY - this.originY;

                this.targetX = mouseX * DAMPING;
                this.targetY = mouseY * DAMPING;
            }),
            { passive: true, signal: this.controller.signal },
        );

        element.addEventListener(
            'pointerleave',
            mouseEventOnly(() => {
                this.isInteracting = false;
                this.animationOut?.kill();

                this.animationOut = gsap
                    .timeline({
                        onStart: () => {
                            this.isTweening = true;
                        },
                        onComplete: () => {
                            this.isTweening = false;
                        },
                        onInterrupt: () => {
                            this.isTweening = false;
                        },
                        defaults: {
                            duration: 1,
                        },
                    })
                    .to(this, {
                        x: 0,
                        y: 0,
                        ease: 'elastic.out(1.5,0.2)',
                    });
            }),
            { passive: true, signal: this.controller.signal },
        );

        window.addEventListener(
            'scroll',
            () => {
                if (this.isIntersecting) {
                    this.resize();
                }
            },
            { passive: true, signal: this.controller.signal },
        );
    }

    private resize(): void {
        const rect = this.element.getBoundingClientRect();

        this.originX = rect.left + rect.width / 2;
        this.originY = rect.top + rect.height / 2;
    }

    public kill(): void {
        this.currentRequestId && cancelAnimationFrame(this.currentRequestId);
        this.animationOut?.kill();
        this.controller.abort();
        this.intersectionObserver.disconnect();
        this.resizeObserver.disconnect();
    }
}

export { StickyElements };
