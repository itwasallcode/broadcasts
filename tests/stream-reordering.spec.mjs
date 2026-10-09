import { expect, test } from '@playwright/test';

import { startServer } from './helpers/server.mjs';

async function visualTitles(page) {
  return page.locator('.stream-cell').evaluateAll((cells) =>
    cells
      .map((cell) => ({
        title: cell.querySelector('iframe')?.title ?? 'Empty',
        x: cell.getBoundingClientRect().x,
        y: cell.getBoundingClientRect().y,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((cell) => cell.title)
  );
}

for (const visualOrder of [true, false]) {
  test(`reordering preserves visual and keyboard order with reading-flow ${visualOrder}`, async ({
    page,
    context,
  }) => {
    const server = await startServer();
    const origin = new URL(server.url).origin;
    let playerLoads = 0;
    try {
      if (!visualOrder) {
        await context.addInitScript(() => {
          const supports = CSS.supports.bind(CSS);
          CSS.supports = (...args) => (args[0] === 'reading-flow' ? false : supports(...args));
        });
      }
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.hostname === 'www.youtube.com' && url.pathname.startsWith('/embed/')) {
          playerLoads += 1;
          return route.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><button>Player control</button>',
          });
        }
        return route.abort();
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(server.url);
      await expect.poll(() => playerLoads).toBe(9);
      const original = await visualTitles(page);
      const expected = [...original.slice(1), original[0]];
      await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
      await expect(page.locator('.menu-panel')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
      const handles = page.locator('.stream-item-handle');
      const from = await handles.first().boundingBox();
      const to = await handles.last().boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
      await page.mouse.up();
      await expect(page.locator('.stream-item-name')).toHaveText(expected);
      await expect.poll(() => visualTitles(page)).toEqual(expected);
      await page.keyboard.press('Escape');

      // Moving an iframe can reload its document even when the element remains connected.
      if (visualOrder) expect(playerLoads).toBe(9);

      // Traverse each player's reload button, home link and embedded control backwards.
      for (const title of [...expected].reverse()) {
        for (let control = 0; control < 3; control += 1) {
          await page.keyboard.press('Shift+Tab');
          await expect
            .poll(() =>
              page.evaluate(
                () => document.activeElement.closest('.stream-cell')?.querySelector('iframe')?.title
              )
            )
            .toBe(title);
        }
      }

      await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
      await page.getByRole('button', { name: '1×1', exact: true }).click();
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect.poll(() => visualTitles(page)).toEqual([expected[0]]);
      await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
      await page.getByRole('button', { name: '4×3', exact: true }).click();
      await expect(page.locator('iframe')).toHaveCount(9);
      await expect.poll(() => visualTitles(page)).toEqual([...expected, 'Empty', 'Empty', 'Empty']);
      await page.reload();
      await expect.poll(() => visualTitles(page)).toEqual([...expected, 'Empty', 'Empty', 'Empty']);
    } finally {
      await context.close();
      await server.close();
    }
  });
}
