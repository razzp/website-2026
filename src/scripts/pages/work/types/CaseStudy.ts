enum Tags {
    Adyen = 'Adyen',
    HTML5 = 'HTML5',
    CSS3 = 'CSS3',
    MobileFirst = 'Mobile First',
    Responsive = 'Responsive',
    Ecommerce = 'E-commerce',
    Bootstrap = 'Bootstrap',
    TypeScript = 'TypeScript',
    Vue = 'Vue.js',
    Accessibility = 'Accessibility',
    Tailwind = 'Tailwind',
    PWA = 'PWA',
    Shopify = 'Shopify',
}

interface CaseStudy {
    title: string;
    abstract: string;
    logo: ImageMetadata;
    backgroundColour: string;
    textColour: string;
    tags: Tags[];
}

export { type CaseStudy, Tags };
