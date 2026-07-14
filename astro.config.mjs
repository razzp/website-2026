// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    fonts: [
        {
            provider: fontProviders.fontsource(),
            name: 'Stack Sans Text',
            cssVariable: '--font-stack-sans-text',
        },
    ],
    prefetch: true,
    vite: {
        plugins: [tailwindcss()],
    },
});
