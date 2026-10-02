import type { ImageMetadata } from 'astro';
import type { SvgComponent } from 'astro/types';

import GitHubIcon from 'bootstrap-icons/icons/github.svg';
import LinkedInIcon from 'bootstrap-icons/icons/linkedin.svg';
import type { Route } from '../config/runtime';

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
    metaTitle: string;
    name: string;
    href: Route;
    heading: string;
    strapline: string;
    theme: PageTheme;
}

const pages = {
    home: {
        metaTitle: 'Home Page',
        name: 'Home',
        href: '/',
        heading: 'hello',
        strapline: "I'm an experienced Web Developer from Devon, England.",
        theme: {
            primary: '#eee',
            primaryContrast: '#111',
        },
    },
    about: {
        metaTitle: 'About Me',
        name: 'About',
        href: '/about',
        heading: 'about',
        strapline:
            "I was born in 1988, and the world hasn't really been the same since.",
        theme: {
            primary: '#00f9ff',
            primaryContrast: '#0f00dd',
        },
    },
    work: {
        metaTitle: 'My Work',
        name: 'Work',
        href: '/work',
        heading: 'work',
        strapline: "I've done quite a bit, and for some cool brands too!",
        theme: {
            primary: '#ff008b',
            primaryContrast: '#003cff',
        },
    },
    contact: {
        metaTitle: 'Contact',
        name: 'Contact',
        href: '/contact',
        heading: 'contact',
        strapline: 'Please get in touch. Especially if you want to hire me!',
        theme: {
            primary: '#fdfe02',
            primaryContrast: '#6a30fe',
        },
    },
} satisfies Record<string, PageMeta>;

const navigation = [
    { name: 'Home', href: pages.home.href },
    { name: 'About', href: pages.about.href },
    { name: 'Work', href: pages.work.href },
    { name: 'Contact', href: pages.contact.href },
    { name: 'Blog', href: '/blog' },
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
    pages,
    socials,
};
