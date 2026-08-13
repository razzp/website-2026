interface PageModule {
    init: () => void;
    destroy: () => void;
}

interface PageRoute {
    loadJs: () => Promise<PageModule>;
    cssScope: string;
}

const pageRoutes: Record<string, PageRoute> = {
    '/': {
        loadJs: () => import('../scripts/pages/index'),
        cssScope: 'index',
    },
    '/about': {
        loadJs: () => import('../scripts/pages/about'),
        cssScope: 'about',
    },
    '/work': {
        loadJs: () => import('../scripts/pages/work'),
        cssScope: 'work',
    },
    '/contact': {
        loadJs: () => import('../scripts/pages/contact'),
        cssScope: 'contact',
    },
};

type RouteKey = keyof typeof pageRoutes;

export { type PageModule, pageRoutes, type RouteKey };
