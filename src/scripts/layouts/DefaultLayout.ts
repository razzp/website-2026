import { gsap } from 'gsap';
import { ScrollToPlugin, ScrollTrigger, SplitText } from 'gsap/all';
import Lenis from 'lenis';
import { findOrThrow } from 'spank-my-dom';
import * as THREE from 'three';
import { PageManager } from '../components/PageManager';
import { isSpecialClick } from '../utils';

gsap.registerPlugin(SplitText);
gsap.registerPlugin(ScrollToPlugin);

const lenis = new Lenis();

lenis.on('scroll', ScrollTrigger.update);

const pageManager = new PageManager({
    transitionIn: () => new Promise((resolve) => setTimeout(resolve, 1000)),
    transitionOut: () => new Promise((resolve) => setTimeout(resolve, 1000)),
});

document
    .querySelectorAll<HTMLAnchorElement>('a[data-link-swap]')
    .forEach((link) => {
        link.addEventListener('click', (event) => {
            if (isSpecialClick(event)) return;

            event.preventDefault();

            if (!pageManager.isBusy) {
                pageManager.loadPage(link.href);
            }
        });
    });

window.addEventListener('popstate', () => {
    pageManager.loadPage(location.href, { push: false });
});

(async () => {
    console.log('begin load...');

    const [{ HeroBackground, HeroForeground }, fontData] = await Promise.all([
        import('../components/Hero'),
        fetch('data/Nunito_Regular.json').then((response) => response.json()),
        document.fonts.ready,
    ]);

    const heroForeground = new HeroForeground({
        container: findOrThrow('#hero-foreground'),
        fontData,
        placeholder: findOrThrow<HTMLElement>('#hero-placeholder'),
        text: 'hello',
    });

    const heroBackground = new HeroBackground({
        container: findOrThrow('#hero-background'),
        fontData,
        placeholder: findOrThrow<HTMLElement>('#hero-placeholder'),
        text: 'hello',
    });

    await Promise.all([heroBackground.compile(), heroForeground.compile()]);

    console.log('loaded');

    heroForeground.resize();
    heroBackground.resize();

    /*const r = new ResizeObserver(() => {
        console.log('resized');
        heroForeground.resize();
        heroBackground.resize();
    });

    r.observe(findOrThrow('#hero-placeholder'));*/

    let needBackground = false;

    const maxRotation = 0.1;
    const mouse = new THREE.Vector2();

    gsap.ticker.lagSmoothing(0);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);

        const targetX = mouse.y * maxRotation;
        const targetY = mouse.x * maxRotation;

        heroForeground.mesh.rotation.x +=
            (targetX - heroForeground.mesh.rotation.x) * 0.1;
        heroForeground.mesh.rotation.y +=
            (targetY - heroForeground.mesh.rotation.y) * 0.1;

        heroForeground.render();

        heroBackground.mesh.rotation.x +=
            (targetX - heroBackground.mesh.rotation.x) * 0.1;
        heroBackground.mesh.rotation.y +=
            (targetY - heroBackground.mesh.rotation.y) * 0.1;

        if (needBackground) {
            heroBackground.render();
        }
    });

    const func = (e: MouseEvent) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    //////////////

    const tl = gsap.timeline({
        onComplete: () => {
            console.log('complete');
            document.documentElement.classList.add('-show-nav');
            document.documentElement.classList.add('-show-content');
            window.addEventListener('pointermove', func);

            /*window.addEventListener('scroll', () => {
                console.log(window.scrollY);
                //heroForeground.camera.position.y = heroForeground.pixelsToWorldUnits(-window.scrollY)
                heroForeground.mesh.position.y = heroForeground.pixelsToWorldUnits(window.scrollY * 0.1)
            }, { passive: true });*/
        },
    });

    //await new Promise((resolve) => setTimeout(resolve, 500));

    const x = heroBackground.getFogProps();
    const y = findOrThrow('main');
    const split = SplitText.create('#hero-strapline', { type: 'words' });

    tl.to(heroBackground.scene.fog, {
        duration: 0.8,
        ease: 'expo.out',
        far: x.farVisible,
        near: x.nearVisible,
        onStart: () => {
            needBackground = true;
        },
    })
        .to(
            y,
            {
                duration: 0.8,
                '--inset-top': '100px',
                ease: 'expo.in',
                onComplete: () => {
                    needBackground = false;
                },
            },
            '>-0.6',
        )
        .to(y, {
            duration: 0.4,
            '--stretch': '50px',
            ease: 'expo.out',
        })
        .to(
            heroForeground.camera.position,
            {
                duration: 0.4,
                y: heroForeground.pixelsToWorldUnits(-50),
                ease: 'expo.out',
            },
            '<',
        )
        .to(y, {
            duration: 0.8,
            '--stretch': '0px',
            ease: 'elastic.out(1,0.5)',
        })
        .to(
            heroForeground.camera.position,
            {
                duration: 0.8,
                y: 0,
                ease: 'elastic.out(1,0.5)',
            },
            '<',
        )
        .from(
            split.words,
            {
                duration: 0.8,
                y: -50,
                skewX: 10,
                autoAlpha: 0,
                stagger: 0.05,
                ease: 'expo.out',
            },
            '<',
        );

    findOrThrow('#foo').addEventListener('click', () => {
        document.documentElement.classList.remove('-show-nav');

        lenis.scrollTo(0, {
            duration: window.scrollY === 0 ? 0 : 0.6,
            easing: gsap.parseEase('expo.inOut'),
            lock: true,
            onComplete: async () => {
                console.log('Reached the top!');

                document.documentElement.classList.remove('-show-content');
                window.removeEventListener('pointermove', func);

                const tl2 = gsap.timeline();

                needBackground = true;

                await tl2
                    .to(y, {
                        duration: 0.8,
                        '--inset-top': '100%',
                        ease: 'expo.inOut',
                    })
                    .to(
                        mouse,
                        {
                            duration: 0.8,
                            x: 0,
                            y: 0,
                            ease: 'expo.inOut',
                        },
                        '<',
                    )
                    .to(
                        heroBackground.scene.fog,
                        {
                            duration: 0.8,
                            ease: 'expo.in',
                            far: x.farHidden,
                            near: x.nearHidden,
                        },
                        '>-0.6',
                    );

                location.reload();
            },
        });
    });
})();
