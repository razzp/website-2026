import { gsap } from 'gsap';

type GSAPAnimation = gsap.core.Timeline | gsap.core.Tween;
type ValidObserver = IntersectionObserver | ResizeObserver;

class PageEntitiesHelper {
    private readonly gsapTickers: Set<gsap.TickerCallback> = new Set();

    public readonly gsapAnimations: Set<GSAPAnimation> = new Set();
    public readonly observers: Set<ValidObserver> = new Set();
    public readonly controllers: Set<AbortController> = new Set();

    public addTicker(callback: gsap.TickerCallback): void {
        this.gsapTickers.add(callback);
        gsap.ticker.add(callback);
    }

    public killAll(): void {
        this.gsapTickers.forEach((callback) => {
            gsap.ticker.remove(callback);
        });

        this.gsapAnimations.forEach((animation) => {
            animation.kill();
        });

        this.observers.forEach((observer) => {
            observer.disconnect();
        });

        this.controllers.forEach((controller) => {
            controller.abort();
        });
    }
}

export { PageEntitiesHelper };
