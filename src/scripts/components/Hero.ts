import {
    type ColorRepresentation,
    DirectionalLight,
    Fog,
    MathUtils,
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
import { Font, type FontData } from 'three/addons/loaders/FontLoader.js';

interface Options {
    container: HTMLElement;
    fontData: FontData;
    placeholder: HTMLElement;
    text: string;
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

abstract class Hero {
    private readonly renderer: WebGLRenderer;
    private readonly container: HTMLElement;
    private readonly placeholder: HTMLElement;
    private readonly font: Font;
    private readonly text: string;
    private readonly textGeometryParams: Partial<TextGeometryParameters>;
    private elementProps: ElementProps;

    public readonly mesh: Mesh;

    protected meshDistanceFromCamera = 0;
    protected meshTotalDepth = 0;

    public readonly scene: Scene;
    public readonly camera: PerspectiveCamera;

    constructor(
        options: Options,
        textGeometryParams?: Partial<TextGeometryParameters>,
    ) {
        const { container, fontData, placeholder, text } = options;

        const scene = new Scene();
        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        const camera = new PerspectiveCamera(75, undefined, 0.1, 1000);
        const mesh = new Mesh();

        camera.position.z = 100;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        scene.add(mesh);
        container.appendChild(renderer.domElement);

        this.scene = scene;
        this.camera = camera;
        this.mesh = mesh;
        this.renderer = renderer;

        this.font = new Font(fontData);
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
        const visibleHeight =
            2 *
            this.meshDistanceFromCamera *
            Math.tan(MathUtils.degToRad(this.camera.fov * 0.5));

        const worldUnitsPerPixel =
            visibleHeight / this.renderer.domElement.height;

        return value * worldUnitsPerPixel;
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

        this.renderer.setSize(containerWidth, containerHeight);

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

    public setText(value: string): void {
        const { placeholderHeight } = this.elementProps;

        this.mesh.geometry.dispose();

        const geometry = new TextGeometry(value, {
            ...this.textGeometryParams,
            font: this.font,
            size: this.pixelsToWorldUnits(placeholderHeight),
            bevelEnabled: true,
            bevelSize: 1,
        });

        const { bevelThickness = 0, depth = 0 } = geometry.parameters.options;

        geometry.center();
        geometry.translate(0, 0, -(depth / 2 + bevelThickness));

        this.mesh.geometry = geometry;
        this.meshTotalDepth = depth + bevelThickness;
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
}

class HeroForeground extends Hero {
    private faceMaterial: MeshStandardMaterial;

    constructor(options: Options) {
        super(options, {
            depth: 20,
        });

        const faceMaterial = new MeshStandardMaterial({ color: 0xffffff });
        const light = new DirectionalLight(0xffffff, 10);

        light.position.set(0, 10, 20);
        light.target.position.set(0, 0, 0);

        this.scene.add(light, light.target);

        this.mesh.material = [
            faceMaterial,
            new MeshStandardMaterial({ color: 0x000000 }),
        ];

        this.faceMaterial = faceMaterial;
    }

    public setTextColour(colour: ColorRepresentation): void {
        this.faceMaterial.color.set(colour);
    }
}

class HeroBackground extends Hero {
    constructor(options: Options) {
        super(options, {
            depth: 100,
            curveSegments: 2,
            bevelSegments: 2,
        });

        const material = new MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            fog: true,
            transparent: true,
        });

        material.onBeforeCompile = (shader) => {
            // Override Three.js behavior: Reduce alpha instead of mixing color
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
    }

    public getFogProps(): FogProps {
        return {
            nearHidden: 0,
            nearVisible: this.meshDistanceFromCamera,
            farHidden: this.meshDistanceFromCamera - 1,
            farVisible: this.meshDistanceFromCamera + this.meshTotalDepth,
        };
    }
}

export { HeroBackground, HeroForeground };
