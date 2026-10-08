import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { BUILDS } from '../setup.mjs';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

export async function startServer(base = '/') {
  const state = { version: 'a', failWorker: false, failAssets: false };
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    if (
      (state.failWorker && pathname.endsWith('/sw.js')) ||
      (state.failAssets && pathname.includes('/assets/'))
    ) {
      res.writeHead(503).end();
      return;
    }
    const file = pathname.slice(base.length) || 'index.html';
    try {
      const body = await readFile(
        join(BUILDS, base === '/' ? 'root' : 'subpath', state.version, file)
      );
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    state,
    url: `http://127.0.0.1:${server.address().port}${base}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function blockExternalRequests(context, url) {
  const origin = new URL(url).origin;
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  );
}
