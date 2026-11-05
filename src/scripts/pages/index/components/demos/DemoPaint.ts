import { findOrThrow } from 'spank-my-dom';
import type { PageEntitiesHelper } from '../../../../components/PageEntitiesHelper';
import { Demo } from './Demo';

class DemoPaint extends Demo {
    private readonly videoElement: HTMLVideoElement;

    constructor(pageEntities: PageEntitiesHelper) {
        const container = findOrThrow<HTMLElement>('.js-demo-paint');

        super(container, pageEntities);

        this.videoElement = findOrThrow('video', container);
    }

    public override start(): void {
        this.videoElement.currentTime = 0;
        this.videoElement.play();
    }

    public override stop(): void {
        this.videoElement.pause();
    }

    public override resize(): void {
        // noop
    }
}

export { DemoPaint };
