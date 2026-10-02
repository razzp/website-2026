import type { ImageMetadata } from 'astro';
import type { SvgComponent } from 'astro/types';

import GitHubIcon from 'bootstrap-icons/icons/github.svg';
import LinkedInIcon from 'bootstrap-icons/icons/linkedin.svg';
import type { RouteKey } from '../config/runtime';

interface Social {
    name: string;
    href: string;
    icon: SvgComponent & ImageMetadata;
}

interface NavItem {
    name: string;
    href: string;
}

interface PageTheme {
    primary: string;
    primaryContrast: string;
}

interface PageMeta {
    routeKey: RouteKey;
    title: string;
    heading: string;
    strapline: string;
    theme: PageTheme;
}

const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/work' },
    { name: 'Contact', href: '/contact' },
    { name: 'Blog', href: '/' },
] satisfies NavItem[];

const socials = [
    {
        name: 'GitHub',
        href: 'http://www.github.com/razzp',
        icon: GitHubIcon,
    },
    {
        name: 'LinkedIn',
        href: 'http://www.linkedin.com',
        icon: LinkedInIcon,
    },
] satisfies Social[];

const emailAddress = 'hello@robertwells.dev';

export {
    emailAddress,
    navigation,
    type PageMeta,
    type PageTheme,
    socials,
};
