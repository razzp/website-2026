import type { State } from '../scripts/layouts/DefaultLayout';

interface PageModule {
    init: (state: State) => void;
    destroy: (state: State) => void;
}

interface PageRoute {
    loadModule: () => Promise<PageModule>;
    cssScope: string;
}

const pageRoutes = {
    '/': {
        loadModule: () => import('../scripts/pages/index/index'),
        cssScope: 'index',
    },
    '/about': {
        loadModule: () => import('../scripts/pages/about/about'),
        cssScope: 'about',
    },
    '/work': {
        loadModule: () => import('../scripts/pages/work/work'),
        cssScope: 'work',
    },
    '/contact': {
        loadModule: () => import('../scripts/pages/contact'),
        cssScope: 'contact',
    },
} satisfies { [key: string]: PageRoute };

type Route = keyof typeof pageRoutes;

export { type PageModule, type PageRoute, pageRoutes, type Route };
