interface PageModule {
    init: () => void;
    initSafe?: () => void;
    destroy: () => void;
}

interface PageRoute {
    load: () => Promise<PageModule>;
}

const pageRoutes: Record<string, PageRoute> = {
    '/': {
        load: () => import('../scripts/pages/index'),
    },
    '/about': {
        load: () => import('../scripts/pages/about'),
    },
    '/work': {
        load: () => import('../scripts/pages/work'),
    },
    '/contact': {
        load: () => import('../scripts/pages/contact'),
    },
};

type RouteKey = keyof typeof pageRoutes;

export { type PageModule, pageRoutes, type RouteKey };
