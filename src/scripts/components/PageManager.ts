import { gsap } from 'gsap';
import { find, findAll, findOrThrow, getDataOrThrow } from 'spank-my-dom';
import { type PageModule, pageRoutes } from '../../config/runtime';
import type { PageMeta } from '../../lib/config';
import type { State } from '../layouts/DefaultLayout';
import { getPageMeta, getScrollPaddingTop, isRoute } from '../utils';
import type { FooterPixels } from './FooterPixels';
import type { HeroBackground, HeroForeground } from './heroes';
import type { MobileNav } from './MobileNav';
import { transitionIn, transitionOut } from './transitions';

interface Options {
    state: State;
    activeModule?: PageModule;
    mobileNav: MobileNav;
    heroBackground: HeroBackground;
    heroForeground: HeroForeground;
    footerPixels: FooterPixels;
}

interface LoadOptions {
    url: URL;
    push?: boolean;
}

interface SwapPageOptions {
    pageMeta: PageMeta;
    doc: Document;
}

class PageManager {
    private readonly state: State;
    private activeModule: PageModule | null;
    private mobileNav: MobileNav;
    private readonly heroBackground: HeroBackground;
    private readonly heroForeground: HeroForeground;
    private readonly footerPixels: FooterPixels;

    private isLocked = false;

    private readonly metaElement = findOrThrow('#page-meta');
    private readonly headingElement = findOrThrow('.js-hero-heading');
    private readonly straplineElement = findOrThrow('.js-hero-strapline');
    private readonly themeElement = findOrThrow('meta[name="theme-color"]');

    constructor(options: Options) {
        const {
            state,
            activeModule = null,
            mobileNav,
            heroBackground,
            heroForeground,
            footerPixels,
        } = options;

        this.state = state;
        this.activeModule = activeModule;
        this.mobileNav = mobileNav;
        this.heroBackground = heroBackground;
        this.heroForeground = heroForeground;
        this.footerPixels = footerPixels;

        history.replaceState(
            { url: window.location.href },
            '',
            window.location.href,
        );
    }

    public async loadOrRedirect(options: LoadOptions): Promise<void> {
        try {
            await this.load(options);
        } catch {
            window.location.href = options.url.toString();
        }
    }

    private async load(options: LoadOptions): Promise<void> {
        const { url, push = true } = options;
        const { pathname: route, hash } = url;

        if (this.isLocked) {
            throw new Error('Page request already in progress');
        }

        if (!isRoute(route)) {
            throw new Error('URL is not a valid route');
        }

        this.isLocked = true;

        if (push) {
            history.pushState({ url: url.toString() }, '', url);
        }

        const pageRoute = pageRoutes[route];
        const htmlRequest = fetch(route).then((response) => response.text());
        const moduleRequest = pageRoute.loadModule();

        if (this.mobileNav.isOpen) {
            await this.mobileNav.close(true);
        }

        const [html, module] = await Promise.all([
            htmlRequest,
            moduleRequest,
            transitionOut({
                state: this.state,
                heroBackground: this.heroBackground,
                onBeforeHide: () => {
                    this.activeModule?.destroy(this.state);
                },
            }),
        ]);

        this.activeModule = module;

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const pageMeta = getPageMeta(doc);

        await this.swapPage({ pageMeta, doc });

        await transitionIn({
            state: this.state,
            heroBackground: this.heroBackground,
            heroForeground: this.heroForeground,
            onBeforeShow: () => {
                document.body.dataset.page = pageRoute.cssScope;
                this.activeModule?.init(this.state);
            },
            onAfterShow: () => {
                this.footerPixels.setColour(pageMeta.theme.primaryContrast);
            },
        });

        this.isLocked = false;

        if (hash) {
            const { enableTransitions, lenis } = this.state;
            const anchorElement = find<HTMLElement>(hash);

            if (anchorElement) {
                // Ensure Lenis is up to date.
                lenis.resize();

                lenis.scrollTo(anchorElement, {
                    duration: 0.8,
                    immediate: !enableTransitions,
                    lock: true,
                    offset: -getScrollPaddingTop(anchorElement),
                    easing: gsap.parseEase('expo.inOut'),
                });
            }
        }
    }

    private async swapPage(options: SwapPageOptions): Promise<void> {
        const { pageMeta, doc } = options;

        document.title = pageMeta.metaTitle;

        this.metaElement.innerHTML = JSON.stringify(pageMeta);
        this.headingElement.innerHTML = pageMeta.heading;
        this.straplineElement.innerHTML = pageMeta.strapline;

        this.themeElement.setAttribute('content', pageMeta.theme.primary);

        findAll<HTMLElement>('[data-swap]').forEach((element) => {
            const id = getDataOrThrow(element, 'swap');
            const newElement = doc.querySelector(`[data-swap="${id}"]`);

            if (newElement) {
                element.replaceWith(newElement);
            }
        });

        this.heroBackground.setText(pageMeta.heading);
        this.heroForeground.setText(pageMeta.heading);

        this.heroBackground.resize();
        this.heroForeground.resize();

        this.heroForeground.applyTheme(pageMeta.theme);
        this.heroBackground.applyTheme(pageMeta.theme);

        for (const [key, value] of Object.entries(pageMeta.theme)) {
            // Ignore 'primary' as we'll animate it next...
            if (this.state.enableTransitions && key === 'primary') continue;

            document.documentElement.style.setProperty(
                `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
                value,
            );
        }

        if (this.state.enableTransitions) {
            const colourTween = document.documentElement.animate(
                {
                    '--theme-primary': pageMeta.theme.primary,
                },
                {
                    duration: 600,
                    fill: 'forwards',
                    easing: 'ease',
                },
            );

            await colourTween.finished;
        }
    }
}

export { PageManager };
