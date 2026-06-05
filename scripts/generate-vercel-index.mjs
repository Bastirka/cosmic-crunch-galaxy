import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const client = resolve(dist, 'client');
const assets = resolve(client, 'assets');
const outFile = resolve(dist, 'index.html');

async function main() {
  const entries = await import('node:fs/promises').then(({ readdir }) => readdir(assets));
  const jsFiles = entries.filter((name) => /^index-.*\.js$/.test(name));
  const cssFiles = entries.filter((name) => /^styles-.*\.css$/.test(name));

  if (jsFiles.length === 0) {
    throw new Error(`No JS entry found in ${assets}`);
  }

  const reads = await Promise.all(jsFiles.map(async (name) => {
    const file = resolve(assets, name);
    const content = await readFile(file, 'utf8');
    return { name, content };
  }));

  const entry = reads.find(({ content }) => content.includes('from"./index-'))?.name ?? jsFiles[0];
  const cssLinks = cssFiles
    .map((name) => `    <link rel="stylesheet" href="./client/assets/${name}" />`)
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#050816" />
    <meta name="description" content="Cosmic Crunch - Idle Stardust Clicker" />
${cssLinks}
    <title>Cosmic Crunch</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./client/assets/${entry}"></script>
  </body>
</html>
`;

  await mkdir(dist, { recursive: true });
  await writeFile(outFile, html);
}

main().catch((error) => {
  console.error('[generate-vercel-index] Failed:', error);
  process.exitCode = 1;
});
