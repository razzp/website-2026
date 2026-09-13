import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import subsetFont from 'subset-font';

// #region Config

const fontPaths = ['./assets/fonts/StackSansText-Regular.ttf'];

const words = ['hello', 'about', 'work', 'contact', 'awesome', '5'];

// #endregion

const characters = [...new Set(words.join(''))].join('');
const start = performance.now();

console.log(chalk.yellow('Starting...'));
console.log(chalk.cyan(`Character subset: ${characters.split('')}`));

try {
    for (const fontPath of fontPaths) {
        const filepath = await create(fontPath);

        console.log(chalk.green(`Created: ${filepath}`));
    }
} finally {
    const elapsed = performance.now() - start;

    console.log(`Finished in ${elapsed.toFixed(2)}ms`);
}

async function create(fontPath: string): Promise<string> {
    const buffer = await fs.readFile(fontPath);

    const subset = await subsetFont(buffer, characters, {
        targetFormat: 'sfnt',
    });

    const filename = `${path.basename(fontPath, path.extname(fontPath))}-subset.ttf`;
    const filepath = path.join('./public/fonts', filename);

    await fs.writeFile(filepath, subset);

    return filepath;
}
