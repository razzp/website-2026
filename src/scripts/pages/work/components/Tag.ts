import RAPIER from '@dimforge/rapier2d-compat';
import { assertIsNotUndefined, guarantee } from 'bossy-boots';

interface PhysicsProps {
    body?: RAPIER.RigidBody;
    width: number;
    height: number;
}

class Tag {
    private readonly physics: PhysicsProps = {
        width: 0,
        height: 0,
    };

    public readonly name: string;

    constructor(public readonly element: HTMLElement) {
        this.name = guarantee(element.dataset.tag);
    }

    public toggle(show: boolean): void {
        if (show) {
            this.element.classList.add('-highlight');
        } else {
            this.element.classList.remove('-highlight');
        }
    }

    public toggleFlow(enabled: boolean): void {
        if (enabled) {
            this.element.style.removeProperty('position');
            this.element.style.removeProperty('transform');
        } else {
            this.element.style.position = 'absolute';
        }
    }

    // #region Physics

    public applyMomentum(value: number): void {
        this.physics.body?.applyImpulse(
            {
                x: 0,
                y: value,
            },
            true,
        );
    }

    public applyPhysics(containerHeight: number): void {
        const { body, width, height } = this.physics;

        assertIsNotUndefined(body);

        const { x, y } = body.translation();
        const rotation = body.rotation();

        const left = x - width;
        const top = containerHeight - y - height;

        this.element.style.transform = `translate3d(${left}px,${top}px,0)rotate(${-rotation}rad)`;
    }

    public initPhysics(world: RAPIER.World, containerRect: DOMRect): void {
        // Rapier's origin is bottom-left.
        // HTML's origin is top-left.
        // Also note that Rapier expects half extents.

        const { width, height, left, top } =
            this.element.getBoundingClientRect();

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const x = left - containerRect.left + halfWidth;
        const y = containerRect.height - (top - containerRect.top + halfHeight);

        const body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(x, y)
                .setRotation(0)
                .setCcdEnabled(false)
                .setCanSleep(true)
                .setLinearDamping(0.1)
                .setAngularDamping(0.1),
        );

        this.physics.body = body;
        this.physics.width = halfWidth;
        this.physics.height = halfHeight;

        const collider = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight)
            .setRestitution(0.8)
            .setFriction(0.5);

        world.createCollider(collider, body);

        // Add some initial velocities.

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100;

        body.setLinvel(
            {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
            },
            true,
        );

        body.setAngvel((Math.random() - 0.5) * 5, true);
    }

    // #endregion
}

export { Tag };
