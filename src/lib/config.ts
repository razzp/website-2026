import type { ImageMetadata } from 'astro';
import type { SvgComponent } from 'astro/types';

import GitHubIcon from 'bootstrap-icons/icons/github.svg';
import LinkedInIcon from 'bootstrap-icons/icons/linkedin.svg';

interface Social {
    name: string;
    href: string;
    icon: SvgComponent & ImageMetadata;
}

interface NavItem {
    name: string;
    href: string;
}

interface Theme {
    primary: string;
    primaryContrast: string;
    contentBackground: string;
    contentText: string;
    meshFace: string;
}

interface Page {
    title: string;
    heading: string;
    strapline: string;
    theme: Theme;
}

const defaultTheme: Theme = {
    primary: '#eee',
    primaryContrast: '#111',
    contentBackground: '#111',
    contentText: '#eee',
    meshFace: '#fff',
};

const navigation: NavItem[] = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/work' },
    { name: 'Contact', href: '/contact' },
    { name: 'Blog', href: '/' },
];

const socials: Social[] = [
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
];

export { defaultTheme, navigation, type Page, socials, type Theme };
