import type { State } from '../scripts/layouts/DefaultLayout';

interface PageModule {
    init: (state: State) => void;
    destroy: (state: State) => void;
}

interface PageRoute {
    loadJs: () => Promise<PageModule>;
    cssScope: string;
}

const pageRoutes: Record<string, PageRoute> = {
    '/': {
        loadJs: () => import('../scripts/pages/index/index'),
        cssScope: 'index',
    },
    '/about': {
        loadJs: () => import('../scripts/pages/about/about'),
        cssScope: 'about',
    },
    '/work': {
        loadJs: () => import('../scripts/pages/work/work'),
        cssScope: 'work',
    },
    '/contact': {
        loadJs: () => import('../scripts/pages/contact'),
        cssScope: 'contact',
    },
};

type Route = keyof typeof pageRoutes;

export { type PageModule, pageRoutes, type Route };
