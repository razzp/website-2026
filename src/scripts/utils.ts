import { findAll, findOrThrow } from 'spank-my-dom';
import type { PageMeta, PageTheme } from '../lib/config';
import type { HeroBackground, HeroForeground } from './components/Hero';
import type { State } from './layouts/DefaultLayout';

function getPageMeta(source: Document): PageMeta {
    return JSON.parse(findOrThrow('#page-meta', source).textContent);
}

function triggerMouseHint(scroll: number): void {
    document.documentElement.classList[scroll === 0 ? 'add' : 'remove'](
        '-show-mouse-hint',
    );
}

async function swapPage(options: {
    state: State;
    pageMeta: PageMeta;
    doc: Document;
    heroBackground: HeroBackground;
    heroForeground: HeroForeground;
}): Promise<void> {
    const { state, pageMeta, doc, heroBackground, heroForeground } = options;

    document.title = pageMeta.title;

    findOrThrow('#hero-strapline').innerHTML = pageMeta.strapline;

    findOrThrow('meta[name="theme-color"]').setAttribute(
        'content',
        pageMeta.theme.primary,
    );

    findAll('[data-swap]').forEach((element) => {
        const id = element.dataset.swap;
        const newElement = doc.querySelector(`[data-swap="${id}"]`);

        if (newElement) {
            element.replaceWith(newElement);
        }
    });

    heroBackground.setText(pageMeta.heading);
    heroForeground.setText(pageMeta.heading);

    heroBackground.resize();
    heroForeground.resize();

    heroForeground.setColour(pageMeta.theme.meshFace);
    heroBackground.setColour(pageMeta.theme.primaryContrast);

    for (const [key, value] of Object.entries(pageMeta.theme)) {
        if (state.enableTransitions && key === 'primary') continue;

        document.documentElement.style.setProperty(
            `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
            value,
        );
    }

    if (state.enableTransitions) {
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

function isSpecialClick(event: PointerEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getThemeVarsAsStyles(theme: PageTheme): string[] {
    return Object.entries(theme).map(
        ([key, value]) =>
            `--theme-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`,
    );
}

export {
    getPageMeta,
    getThemeVarsAsStyles,
    isSpecialClick,
    swapPage,
    triggerMouseHint,
};
