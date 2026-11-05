import { clamp } from 'spank-my-dom';

interface Options {
    delay: number;
    onTick?: (tick: { elapsed: number; elapsedNormalised: number }) => void;
    onInterval?: (count: number) => void;
}

class IntervalTimer {
    private readonly delay: number;
    private readonly onTick?: (tick: {
        elapsed: number;
        elapsedNormalised: number;
    }) => void;
    private readonly onInterval?: (count: number) => void;

    private rafId: number | null = null;
    private isPaused = true;
    private elapsed = 0;
    private startTime: number | null = null;
    private intervalCount = 0;

    constructor(options: Options) {
        const { delay, onTick, onInterval } = options;

        this.delay = delay;
        this.onTick = onTick;
        this.onInterval = onInterval;
    }

    public start(): void {
        if (!this.isPaused) return;

        this.isPaused = false;

        const tick = (timestamp: number) => {
            this.startTime ??= timestamp - this.elapsed;

            const elapsed = clamp(timestamp - this.startTime, 0, this.delay);

            this.onTick?.({
                elapsed,
                elapsedNormalised: elapsed / this.delay,
            });

            if (elapsed >= this.delay) {
                this.intervalCount++;
                this.startTime = timestamp;

                this.onInterval?.(this.intervalCount);
            }

            this.elapsed = elapsed;
            this.rafId = requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    public pause(): void {
        if (this.isPaused) return;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        this.isPaused = true;
        this.startTime = null;
    }

    public reset(): void {
        this.startTime = null;
        this.elapsed = 0;
    }
}

export { IntervalTimer };
