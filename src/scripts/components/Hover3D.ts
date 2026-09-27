import { gsap } from 'gsap';
import { mapNormalisedToRange, mouseEventOnly } from '../utils';

const SPEED = 20;

class Hover3D {
    private rect: DOMRect;
    private readonly intersectionObserver: IntersectionObserver;
    private readonly resizeObserver: ResizeObserver;
    private animationOut?: gsap.core.Animation;

    private readonly controller = new AbortController();
    private isIntersecting = false;
    private isInteracting = false;
    private isTweening = false;
    private lastTime: number | null = null;
    private currentRequestId: number | null = null;

    private rotateX = 0;
    private targetRotateX = 0;
    private rotateY = 0;
    private targetRotateY = 0;
    private bgX = 0;
    private targetBgX = 0;
    private shadowX = 0;
    private targetShadowX = 0;
    private shadowY = 0;
    private targetShadowY = 0;

    constructor(private readonly element: HTMLElement) {
        this.rect = element.getBoundingClientRect();

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

                this.rotateX += (this.targetRotateX - this.rotateX) * smoothing;
                this.rotateY += (this.targetRotateY - this.rotateY) * smoothing;
                this.bgX += (this.targetBgX - this.bgX) * smoothing;
                this.shadowX += (this.targetShadowX - this.shadowX) * smoothing;
                this.shadowY += (this.targetShadowY - this.shadowY) * smoothing;
            }

            element.style.transform = `
                perspective(1000px)
                rotateX(${this.rotateX}deg)
                rotateY(${-this.rotateY}deg)
            `;

            element.style.setProperty('--bg-x', `${this.bgX}px`);
            element.style.setProperty('--shadow-x', `${this.shadowX}px`);
            element.style.setProperty('--shadow-y', `${this.shadowY}px`);

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
        );

        element.addEventListener(
            'pointermove',
            mouseEventOnly((event) => {
                const x = event.clientX - this.rect.left;
                const y = event.clientY - this.rect.top;

                const centerX = this.rect.width / 2;
                const centerY = this.rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * 5;
                const rotateY = ((x - centerX) / centerX) * 10;

                const normalisedX = x / this.rect.width;
                const normalisedY = y / this.rect.height;

                this.targetRotateX = rotateX;
                this.targetRotateY = rotateY;
                this.targetBgX = mapNormalisedToRange(
                    normalisedX,
                    -centerX,
                    centerX,
                );
                this.targetShadowX = mapNormalisedToRange(normalisedX, -40, 40);
                this.targetShadowY = mapNormalisedToRange(normalisedY, -40, 40);
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
                            duration: 2,
                        },
                    })
                    .to(this, {
                        rotateX: 0,
                        rotateY: 0,
                        ease: 'elastic.out(1.5,0.2)',
                    })
                    .to(
                        this,
                        {
                            bgX: 0,
                            shadowX: 0,
                            shadowY: 0,
                            ease: 'expo.out',
                        },
                        '<',
                    );
            }),
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

    public resize(): void {
        this.rect = this.element.getBoundingClientRect();
    }

    public kill(): void {
        this.currentRequestId && cancelAnimationFrame(this.currentRequestId);
        this.animationOut?.kill();
        this.controller.abort();
        this.intersectionObserver.disconnect();
        this.resizeObserver.disconnect();
    }
}

export { Hover3D };
