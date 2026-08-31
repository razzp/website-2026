import type RAPIER from '@dimforge/rapier2d-compat';

interface PageState {
    mouseX: number;
    mouseY: number;
    currentScroll: number;
    scrollImpulse: number;
    inert: boolean;
    studies: {
        intersectionStates: Map<Element, IntersectionObserverEntry>;
        tagsIntersecting: boolean;
        tagsPhysicsWorld?: RAPIER.World;
        physicsFrameRequestId?: number;
    };
}

export type { PageState };
