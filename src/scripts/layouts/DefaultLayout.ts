import { PageManager } from '../components/PageManager';
import { isSpecialClick } from '../utils';

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
