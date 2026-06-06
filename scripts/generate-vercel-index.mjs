import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const assetsDir = resolve(dist, 'client', 'assets');
const outFile = resolve(dist, 'index.html');

async function main() {
  const files = await readdir(assetsDir);
  const jsEntry = files.find((name) => /^index-.*\.js$/.test(name));
  const cssEntry = files.find((name) => /^styles-.*\.css$/.test(name));

  if (!jsEntry) {
    throw new Error(`Could not find client entry bundle in ${assetsDir}`);
  }

  const cssLink = cssEntry ? `    <link rel="stylesheet" href="./client/assets/${cssEntry}" />\n` : '';
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#050816" />
    <meta name="description" content="Cosmic Crunch - Idle Stardust Clicker" />
${cssLink}    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>Cosmic Crunch</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./client/assets/${jsEntry}"></script>
  </body>
</html>
`;

  await mkdir(dist, { recursive: true });
  await writeFile(outFile, html, 'utf8');
}

main().catch((error) => {
  console.error('[generate-vercel-index] Failed:', error);
  process.exitCode = 1;
});
