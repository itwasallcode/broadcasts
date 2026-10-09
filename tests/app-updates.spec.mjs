import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';

const WORKSPACE = {
  version: 1,
  layout: '3x0',
  activePlaylistId: 'default',
  customSources: [
    {
      id: 'custom-dQw4w9WgXcQ',
      label: 'Personal',
      playback: { provider: 'youtube', kind: 'video', videoId: 'dQw4w9WgXcQ' },
    },
  ],
  playlists: [
    { id: 'default', order: ['cnn-turk', 'custom-dQw4w9WgXcQ', 'a-haber'], hidden: ['halk-tv'] },
    { id: 'personal', name: 'My List', order: ['custom-dQw4w9WgXcQ', 'cnn-turk'] },
  ],
};

for (const base of ['/', '/broadcasts/']) {
  test(`real update cycle preserves preferences and handles errors at ${base}`, async ({
    page,
    context,
  }) => {
    const server = await startServer(base);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await blockExternalRequests(context, server.url);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(server.url);
      await page.waitForFunction(() => navigator.serviceWorker.controller);
      await page.evaluate((workspace) => {
        localStorage.setItem('broadcasts:workspace', JSON.stringify(workspace));
      }, WORKSPACE);
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      const button = page.locator('.app-update-btn');
      await button.click();
      await expect(button).toHaveText('Up to Date');
      await expect(button).toHaveText('Check for Updates');

      server.state.failWorker = true;
      await button.click();
      await expect(button).toHaveText('Check Failed — Retry');
      server.state.failWorker = false;
      await context.setOffline(true);
      await button.click();
      await expect(button).toHaveText('Check Failed — Retry');
      await expect(button).toBeEnabled();
      await context.setOffline(false);

      const other = await context.newPage();
      await other.goto(server.url);
      await other.getByRole('button', { name: 'Toggle menu' }).click();
      server.state.version = 'b';
      server.state.failAssets = true;
      await button.click();
      await expect(button).toHaveText('Check Failed — Retry');
      await expect(page.locator('meta[name="test-build"]')).toHaveAttribute('content', 'a');

      server.state.failAssets = false;
      await button.click();
      await expect(button).toHaveText('Update and Reload');
      await expect(page.locator('meta[name="test-build"]')).toHaveAttribute('content', 'a');
      await button.click();
      await expect(page.locator('meta[name="test-build"]')).toHaveAttribute('content', 'b');
      await expect(page.locator('iframe')).toHaveCount(3);
      await expect(page.locator('iframe[title="CNN Türk"]')).toHaveAttribute('src', /abcdefghijk/);
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')))
      ).toEqual(WORKSPACE);

      await expect(other.locator('meta[name="test-build"]')).toHaveAttribute('content', 'a');
      await other.getByRole('button', { name: 'Update and Reload', exact: true }).click();
      await expect(other.locator('meta[name="test-build"]')).toHaveAttribute('content', 'b');
      expect(
        await other.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')))
      ).toEqual(WORKSPACE);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await server.close();
    }
  });
}
