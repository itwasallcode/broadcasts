import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';

const readSaved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')));
async function blockSaving(page) {
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'broadcasts:workspace') throw new DOMException('Full', 'QuotaExceededError');
      return window.originalSetItem.call(this, key, value);
    };
  });
}
async function allowSaving(page) {
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
}

for (const mobile of [true, false]) {
  test(`failed changes remain usable and retry saves the latest state on ${mobile ? 'touch' : 'desktop'}`, async ({
    browser,
  }) => {
    const server = await startServer(mobile ? '/' : '/broadcasts/');
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1280, height: 844 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    try {
      await blockExternalRequests(context, server.url);
      const page = await context.newPage();
      await page.goto(server.url);
      const before = await readSaved(page);
      await blockSaving(page);
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await page.getByLabel('Playlist', { exact: true }).selectOption('__create__');
      await page.getByLabel('Playlist name', { exact: true }).fill('Unsaved');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText(
        'Changes Not SavedYour latest changes may be lost if you close or reload the app.'
      );
      await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
      if (mobile)
        await page.screenshot({
          path: test.info().outputPath('save-error-menu.png'),
          animations: 'disabled',
        });
      expect(await readSaved(page)).toEqual(before);
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Rename', exact: true }).click();
      await page.getByLabel('Playlist name', { exact: true }).fill('Latest Changes');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByRole('button', { name: '2×2', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(1);
      if (mobile)
        await page.screenshot({
          path: test.info().outputPath('save-error-floating.png'),
          animations: 'disabled',
        });
      await allowSaving(page);
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeFocused();
      const saved = await readSaved(page);
      expect(saved.layout).toBe('2x2');
      expect(saved.playlists.at(-1).name).toBe('Latest Changes');
      expect(saved.playlists[0]).toEqual(before.playlists[0]);
      await page.reload();
      expect(await readSaved(page)).toEqual(saved);
      await expect(page.getByRole('alert')).toHaveCount(0);

      await blockSaving(page);
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await page.getByLabel('Playlist', { exact: true }).selectOption('default');
      await expect(page.getByRole('alert')).toBeVisible();
      await allowSaving(page);
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
      if (mobile)
        await expect(page.getByLabel('Playlist', { exact: true })).toHaveCSS('font-size', '16px');
      await expect(page.getByRole('alert')).toHaveCount(0);
    } finally {
      await context.close();
      await server.close();
    }
  });
}

test('a later successful change clears the warning without a manual retry', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    await blockSaving(page);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('button', { name: 'Remove CNN Türk', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await allowSaving(page);
    await page.getByRole('button', { name: 'Remove A Haber', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect((await readSaved(page)).playlists[0].hidden).toEqual(['cnn-turk', 'a-haber']);
  } finally {
    await context.close();
    await server.close();
  }
});

test('unavailable storage at startup is reported without blocking the app', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await context.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('Denied', 'SecurityError');
      };
    });
    await page.goto(server.url);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(page.getByLabel('Playlist', { exact: true })).toHaveValue('default');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  } finally {
    await context.close();
    await server.close();
  }
});
