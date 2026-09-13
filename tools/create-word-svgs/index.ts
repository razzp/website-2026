import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import * as fontkit from 'fontkit';
import { chromium, type Page } from 'playwright';

interface Word {
    font: keyof typeof fontPaths;
    text: string;
    filename: `${string}.svg`;
    splitSubPaths: boolean;
    splitSubPathsIgnoreChars?: string[];
}

// #region Config

const fontSize = 100;
const padding = 100;
const outputPath = './src/images/words/';

const fontPaths = {
    stackSans: './assets/fonts/StackSansText-Regular.ttf',
};

const words = [
    {
        font: 'stackSans',
        text: 'awesome',
        filename: 'awesome.svg',
        splitSubPaths: true,
        splitSubPathsIgnoreChars: ['o'],
    },
] satisfies Word[];

// #endregion

console.log(chalk.yellow('Starting...'));

const start = performance.now();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
    for (const word of words) {
        const filepath = await create(word, page);

        console.log(chalk.green(`Created: ${filepath}`));
    }
} finally {
    await browser.close();

    const elapsed = performance.now() - start;

    console.log(`Finished in ${elapsed.toFixed(2)}ms`);
}

async function create(word: Word, page: Page): Promise<string> {
    const {
        text,
        filename,
        splitSubPaths,
        splitSubPathsIgnoreChars = [],
    } = word;

    const fontPath = fontPaths[word.font];
    const font = (await fontkit.open(fontPath)) as fontkit.Font;
    const run = font.layout(text);

    const scale = fontSize / font.unitsPerEm;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let x = 0;

    for (const [i, glyph] of run.glyphs.entries()) {
        const { xAdvance } = run.positions[i];
        const { minX: x1, minY: y1, maxX: x2, maxY: y2 } = glyph.bbox;

        minX = Math.min(minX, x + x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x + x2);
        maxY = Math.max(maxY, y2);
        x += xAdvance;
    }

    const width = (maxX - minX) * scale + padding;
    const height = (maxY - minY) * scale + padding;

    const paths = await Promise.all(
        run.glyphs.flatMap(async (glyph, i) => {
            const x = run.positions
                .slice(0, i)
                .reduce((sum, { xAdvance }) => sum + xAdvance, 0);

            const tx = (x - minX) * scale + padding / 2;
            const ty = maxY * scale + padding / 2;
            const path = glyph.path.toSVG();
            const subPaths = getSubPaths(path);

            const toPathElement = (
                pathData: string,
                pathLength: number,
            ): string =>
                `<path vector-effect="non-scaling-stroke" d="${pathData}" data-path-length="${pathLength}" transform="translate(${tx} ${ty}) scale(${scale} ${-scale})" />`;

            if (
                splitSubPaths &&
                !splitSubPathsIgnoreChars.includes(glyph.name)
            ) {
                // Sub path splitting is enabled, and this char is not ignored.
                // In this instance we will create separate <path> elements,
                // each of which will have a path-length attribute set. At runtime
                // this will be the same value you'd get calling getTotalLength().
                return await Promise.all(
                    subPaths.map(async (path) =>
                        toPathElement(path, await getPathLength(path, page)),
                    ),
                );
            } else {
                // Either sub path splitting is disabled, or this char is ignored.
                // That means this path could contain multiple sub paths, but we
                // are NOT going to create separate <path> elements for them.
                // In this instance we will instead calculate the path lengths
                // for each sub path, and set the path-length attribute to the
                // LARGEST value in the collection. At runtime, this will NOT
                // match the value returned by getTotalLength(). The reason for
                // this is that some sub paths rely on fill rules and cannot be
                // split apart. For example the cutout in the letter "O".
                const subPathLengths = await Promise.all(
                    subPaths.map(async (path) => getPathLength(path, page)),
                );

                return toPathElement(path, Math.max(...subPathLengths));
            }
        }),
    );

    const svg = `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
    >
        <g>
            ${paths.join('\n')}
        </g>
    </svg>`;

    const filepath = path.join(outputPath, filename);

    await fs.writeFile(filepath, svg);

    return filepath;
}

async function getPathLength(pathData: string, page: Page): Promise<number> {
    return page.evaluate((d) => {
        const namespace = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(namespace, 'svg');
        const path = document.createElementNS(namespace, 'path');

        path.setAttribute('d', d);
        svg.appendChild(path);
        document.body.appendChild(svg);

        const length = path.getTotalLength();

        svg.remove();

        return length;
    }, pathData);
}

function getSubPaths(path: string): string[] {
    return (
        path.match(/[Mm][^Mm]*/g)?.map((subPath) => subPath.trim()) ?? [path]
    );
}
