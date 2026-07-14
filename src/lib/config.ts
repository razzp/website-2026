import type { ImageMetadata } from 'astro';
import type { SvgComponent } from 'astro/types';

import GitHubLogo from 'bootstrap-icons/icons/github.svg';
import LinkedInLogo from 'bootstrap-icons/icons/linkedin.svg';

interface Social {
    name: string;
    href: string;
    component: SvgComponent & ImageMetadata;
}

interface Page {
    name: string;
    href: string;
}

interface Theme {
    primary: string;
    primaryContrast: string;
}

const defaultTheme: Theme = {
    primary: 'oklch(0.252 0 0)',
    primaryContrast: 'oklch(0.9491 0 0)',
};

const pages: Page[] = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/' },
    { name: 'Contact', href: '/' },
    { name: 'Blog', href: '/' },
];

const socials: Social[] = [
    {
        name: 'GitHub',
        href: 'http://www.github.com/razzp',
        component: GitHubLogo,
    },
    {
        name: 'LinkedIn',
        href: 'http://www.linkedin.com',
        component: LinkedInLogo,
    },
];

export { defaultTheme, pages, socials, type Theme };
