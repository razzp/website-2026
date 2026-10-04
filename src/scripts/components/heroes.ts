import {
    Fog,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
} from 'three';
import {
    TextGeometry,
    type TextGeometryParameters,
} from 'three/addons/geometries/TextGeometry.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import type { PageTheme } from '../../lib/config';
import type { State } from '../layouts/DefaultLayout';
import { pixelsToWorldUnits } from '../utils';

interface Options {
    state: State;
    container: HTMLElement;
    placeholder: HTMLElement;
    text: string;
    theme: PageTheme;
}

interface ElementProps {
    containerWidth: number;
    containerHeight: number;
    containerTop: number;
    placeholderHeight: number;
    placeholderTop: number;
}

interface FogProps {
    nearHidden: number;
    nearVisible: number;
    farHidden: number;
    farVisible: number;
}

const MAX_ROTATION = 0.1;
const ROTATION_SPEED = 0.1;

abstract class Hero {
    private readonly font: Font;
    private readonly renderer: WebGLRenderer;
    private readonly container: HTMLElement;
    private readonly placeholder: HTMLElement;
    private text: string;
    private readonly textGeometryParams: Partial<TextGeometryParameters>;
    private elementProps: ElementProps;

    protected meshDistanceFromCamera = 0;
    protected meshDepth = 0;

    public readonly scene: Scene;
    public readonly camera: PerspectiveCamera;
    public readonly mesh: Mesh;

    constructor(
        options: Options,
        textGeometryParams?: Partial<TextGeometryParameters>,
    ) {
        const { state, container, placeholder, text } = options;

        const scene = new Scene();
        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        const camera = new PerspectiveCamera(75, undefined, 0.1, 1000);
        const mesh = new Mesh();

        camera.position.z = 100;

        renderer.domElement.className = 'w-full h-auto';

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        scene.add(mesh);
        container.appendChild(renderer.domElement);

        this.font = state.threeJsFont;
        this.scene = scene;
        this.camera = camera;
        this.mesh = mesh;
        this.renderer = renderer;

        this.text = text;
        this.textGeometryParams = { ...textGeometryParams };

        this.container = container;
        this.placeholder = placeholder;
        this.elementProps = this.getElementProps();
        this.meshDistanceFromCamera = camera.position.distanceTo(mesh.position);
    }

    public async compile(): Promise<void> {
        await this.renderer.compileAsync(this.scene, this.camera);
    }

    public pixelsToWorldUnits(value: number): number {
        return pixelsToWorldUnits(value, this.camera, this.renderer);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public resize(): void {
        this.elementProps = this.getElementProps();

        const {
            containerWidth,
            containerHeight,
            placeholderHeight,
            placeholderTop,
            containerTop,
        } = this.elementProps;

        const heightDiff = containerHeight / 2 - placeholderHeight / 2;
        const offsetDiff = placeholderTop - containerTop;

        this.camera.aspect = containerWidth / containerHeight;

        this.renderer.setSize(containerWidth, containerHeight, false);

        this.camera.setViewOffset(
            containerWidth,
            containerHeight,
            0,
            heightDiff - offsetDiff,
            containerWidth,
            containerHeight,
        );

        this.camera.updateProjectionMatrix();
        this.setText(this.text);
    }

    public rotate(x: number, y: number): void {
        this.mesh.rotation.x += (x - this.mesh.rotation.x) * ROTATION_SPEED;
        this.mesh.rotation.y += (y - this.mesh.rotation.y) * ROTATION_SPEED;
    }

    public setText(value: string): void {
        const { placeholderHeight } = this.elementProps;

        this.mesh.geometry.dispose();

        const geometry = new TextGeometry(value, {
            ...this.textGeometryParams,
            font: this.font,
            size: this.pixelsToWorldUnits(placeholderHeight),
            bevelEnabled: false,
        });

        const { depth = 0 } = geometry.parameters.options;

        geometry.center();
        geometry.translate(0, 0, -(depth / 2));

        this.mesh.geometry = geometry;
        this.meshDepth = depth;
        this.text = value;
    }

    private getElementProps(): ElementProps {
        const placeholderRect = this.placeholder.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        return {
            containerWidth: containerRect.width,
            containerHeight: containerRect.height,
            containerTop: containerRect.top,
            placeholderHeight: placeholderRect.height,
            placeholderTop: placeholderRect.top,
        };
    }

    abstract applyTheme(theme: PageTheme): void;
}

class HeroForeground extends Hero {
    private faceMaterial: MeshBasicMaterial;
    private extrusionMaterial: MeshStandardMaterial;
    private light: HemisphereLight;

    constructor(options: Options) {
        super(options, {
            depth: 20,
        });

        const { theme } = options;

        const light = new HemisphereLight(
            theme.primaryContrast,
            theme.primary,
            0.2,
        );

        this.light = light;
        this.scene.add(light);

        const faceMaterial = new MeshBasicMaterial({
            color: theme.primary,
        });

        const extrusionMaterial = new MeshStandardMaterial({
            color: 0xffffff,
        });

        this.faceMaterial = faceMaterial;
        this.extrusionMaterial = extrusionMaterial;

        this.mesh.material = [faceMaterial, extrusionMaterial];
    }

    public override applyTheme(theme: PageTheme): void {
        this.faceMaterial.color.set(theme.primary);
        this.extrusionMaterial.color.set(0xffffff);

        this.light.color.set(theme.primaryContrast);
        this.light.groundColor.set(theme.primary);
    }
}

class HeroBackground extends Hero {
    private material: MeshBasicMaterial;

    constructor(options: Options) {
        super(options, {
            depth: 100,
            curveSegments: 2,
            bevelSegments: 2,
        });

        const { theme } = options;

        const material = new MeshBasicMaterial({
            color: theme.primaryContrast,
            wireframe: true,
            fog: true,
            transparent: true,
        });

        material.onBeforeCompile = (shader) => {
            // Reduce alpha instead of mixing color.
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <fog_fragment>',
                `
                #ifdef USE_FOG
                    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
                    gl_FragColor.a = min(1.0 - fogFactor, gl_FragColor.a);
                #endif
                `,
            );
        };

        const fogProps = this.getFogProps();
        const fog = new Fog(0x000000, fogProps.nearHidden, fogProps.farHidden);

        this.scene.fog = fog;
        this.mesh.material = material;
        this.material = material;
    }

    public getFogProps(): FogProps {
        return {
            nearHidden: 0,
            nearVisible: this.meshDistanceFromCamera,
            farHidden: this.meshDistanceFromCamera - 1,
            farVisible: this.meshDistanceFromCamera + this.meshDepth,
        };
    }

    public override applyTheme(theme: PageTheme): void {
        this.material.color.set(theme.primaryContrast);
    }
}

function getRotationVectors(state: State): [x: number, y: number] {
    const targetX = state.interactive
        ? (state.mouse.x / window.innerWidth) * 2 - 1
        : 0;

    const targetY = state.interactive
        ? -(state.mouse.y / window.innerHeight) * 2 + 1
        : 0;

    const x = targetY * MAX_ROTATION;
    const y = targetX * MAX_ROTATION;

    return [x, y];
}

export { getRotationVectors, HeroBackground, HeroForeground };
