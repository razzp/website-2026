import { gsap } from 'gsap';
import type * as THREE from 'three';

interface AddOptions<T> {
    onKill?: (value: T) => void;
    onReset?: (value: T) => void;
}

interface Entity {
    kill: () => void;
    reset: () => void;
}

class PageEntitiesHelper {
    private readonly entities = new Map<symbol, Entity>();
    private readonly tickers = new Set<(time: number) => void>();
    private currentRequestId: number | null = null;

    private checkForTickers(): void {
        const tick = (time: number) => {
            for (const ticker of this.tickers.values()) {
                ticker(time);
            }

            if (this.tickers.size > 0) {
                this.currentRequestId = requestAnimationFrame(tick);
            } else {
                this.currentRequestId = null;
            }
        };

        if (!this.currentRequestId) {
            this.currentRequestId = requestAnimationFrame(tick);
        }
    }

    public add<T>(value: T, options: AddOptions<T>): symbol {
        const id = Symbol();
        const { onKill, onReset } = { ...options };
        const exists = () => this.entities.has(id);

        this.entities.set(id, {
            kill: () => {
                if (exists()) {
                    onKill?.(value);
                    this.entities.delete(id);
                }
            },
            reset: () => {
                if (exists()) {
                    onReset?.(value);
                }
            },
        });

        return id;
    }

    public addAnimation(
        value: Animation,
        options?: { pauseOnReset: boolean },
    ): symbol {
        const { pauseOnReset = true } = { ...options };

        return this.add(value, {
            onKill: (ref) => {
                ref.cancel();
            },
            onReset: (ref) => {
                ref.currentTime = 0;

                if (pauseOnReset) {
                    ref.pause();
                }
            },
        });
    }

    public addGsapAnimation(
        value: gsap.core.Animation,
        options?: { pauseOnReset: boolean },
    ): symbol {
        const { pauseOnReset = true } = { ...options };

        return this.add(value, {
            onKill: (ref) => {
                ref.scrollTrigger?.kill();
                ref.revert();
            },
            onReset: (ref) => {
                ref.seek(0);

                if (pauseOnReset) {
                    ref.pause();
                }
            },
        });
    }

    public addController(value: AbortController): symbol {
        return this.add(value, {
            onKill: (ref) => {
                ref.abort();
            },
        });
    }

    public addObserver(value: IntersectionObserver | ResizeObserver): symbol {
        return this.add(value, {
            onKill: (ref) => {
                ref.disconnect();
            },
        });
    }

    public addThreeRenderer(value: THREE.WebGLRenderer): symbol {
        return this.add(value, {
            onKill: (ref) => {
                ref.dispose();
                ref.forceContextLoss();
            },
        });
    }

    public addTicker(callback: (time: number) => void): symbol {
        this.tickers.add(callback);
        this.checkForTickers();

        return this.add(callback, {
            onKill: (ref) => {
                this.tickers.delete(ref);
            },
        });
    }

    public addGsapTicker(callback: gsap.TickerCallback): symbol {
        gsap.ticker.add(callback);

        return this.add(callback, {
            onKill: (ref) => {
                gsap.ticker.remove(ref);
            },
        });
    }

    public reset(...ids: symbol[]): void {
        for (const id of ids) {
            this.entities.get(id)?.reset();
        }
    }

    public kill(...ids: symbol[]): void {
        for (const id of ids) {
            this.entities.get(id)?.kill();
        }
    }

    public killAll(): void {
        if (this.currentRequestId) {
            cancelAnimationFrame(this.currentRequestId);
            this.currentRequestId = null;
        }

        for (const entity of this.entities.values()) {
            entity.kill();
        }

        this.entities.clear();
        this.tickers.clear();
    }
}

export { PageEntitiesHelper };
