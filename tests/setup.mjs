import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const BUILDS = join(ROOT, '.playwright/builds');

export default async function setup() {
  const catalogPath = join(ROOT, 'src/data/turkish-streams.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  for (const base of ['/', '/broadcasts/']) {
    for (const version of ['a', 'b']) {
      await build({
        root: ROOT,
        base,
        logLevel: 'error',
        build: {
          outDir: join(BUILDS, base === '/' ? 'root' : 'subpath', version),
          emptyOutDir: true,
        },
        plugins: [
          {
            name: 'update-test-fixture',
            enforce: 'pre',
            transformIndexHtml(html) {
              return html.replace(
                '</head>',
                `<meta name="test-build" content="${version}"></head>`
              );
            },
            load(id) {
              if (version !== 'b' || id !== catalogPath) return;
              const next = structuredClone(catalog);
              next.sources.find((source) => source.id === 'cnn-turk').playback.videoId =
                'abcdefghijk';
              return JSON.stringify(next);
            },
          },
        ],
      });
    }
  }
}
