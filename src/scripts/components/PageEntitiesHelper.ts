import { gsap } from 'gsap';

type GSAPAnimation = gsap.core.Timeline | gsap.core.Tween;
type ValidObserver = IntersectionObserver | ResizeObserver;

class PageEntitiesHelper {
    private readonly gsapTickers: Set<gsap.TickerCallback> = new Set();

    public readonly gsapAnimations: Set<GSAPAnimation> = new Set();
    public readonly observers: Set<ValidObserver> = new Set();
    public readonly controllers: Set<AbortController> = new Set();
    public readonly frameRequests: Set<number> = new Set();
    public readonly funcs: Set<() => void> = new Set();

    public addTicker(callback: gsap.TickerCallback): void {
        this.gsapTickers.add(callback);
        gsap.ticker.add(callback);
    }

    public requestAnimationFrame(callback: FrameRequestCallback): number {
        const handle = requestAnimationFrame((time) => {
            this.frameRequests.delete(handle);
            callback(time);
        });

        this.frameRequests.add(handle);

        return handle;
    }

    public cancelAnimationFrame(handle: number): void {
        cancelAnimationFrame(handle);
        this.frameRequests.delete(handle);
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

        this.frameRequests.forEach((id) => {
            cancelAnimationFrame(id);
        });

        this.funcs.forEach((func) => {
            func();
        });

        this.gsapTickers.clear();
        this.gsapAnimations.clear();
        this.observers.clear();
        this.controllers.clear();
        this.frameRequests.clear();
        this.funcs.clear();
    }

    public updatable<T = unknown>({
        kill,
    }: {
        kill: (oldValue: T | undefined) => void;
    }) {
        const map = new Map<Element, T>();

        this.funcs.add(() => {
            map.forEach((value) => {
                kill(value);
            });

            map.clear();
        });

        return {
            update: (target: Element, value: T) => {
                kill(map.get(target));
                map.set(target, value);
            },
        };
    }
}

export { PageEntitiesHelper };
