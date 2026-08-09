class PageEntitiesHelper {
    public readonly gsapTimelines: Set<gsap.core.Timeline> = new Set();
    public readonly controllers: Set<AbortController> = new Set();

    public killAll(): void {
        this.gsapTimelines?.forEach((timeline) => {
            timeline.kill();
        });

        this.controllers?.forEach((controller) => {
            controller.abort();
        });
    }
}

export { PageEntitiesHelper };
