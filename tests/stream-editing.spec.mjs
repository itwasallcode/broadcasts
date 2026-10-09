import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';

const PERSONAL_ID = 'custom-dQw4w9WgXcQ';
const SAVED = {
  version: 1,
  layout: '3x0',
  activePlaylistId: 'personal',
  customSources: [
    {
      id: PERSONAL_ID,
      label: 'Personal',
      playback: { provider: 'youtube', kind: 'video', videoId: 'dQw4w9WgXcQ' },
    },
  ],
  playlists: [
    { id: 'default', order: [PERSONAL_ID, 'cnn-turk'], hidden: ['halk-tv'] },
    { id: 'personal', name: 'Morning', order: [PERSONAL_ID, 'cnn-turk'] },
  ],
};

for (const mobile of [true, false]) {
  test(`editing, cancellation and focus preserve preferences on ${mobile ? 'touch' : 'desktop'}`, async ({
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
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.url);
      await page.evaluate(
        (workspace) => localStorage.setItem('broadcasts:workspace', JSON.stringify(workspace)),
        SAVED
      );
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      const editor = page.getByRole('button', { name: 'Edit Personal', exact: true });
      await expect(page.getByRole('button', { name: 'Edit CNN Türk', exact: true })).toHaveCount(0);
      await editor.click();
      const url = page.getByLabel('YouTube URL', { exact: true });
      const name = page.getByLabel('Stream name');
      const save = page.getByRole('button', { name: 'Save', exact: true });
      await expect(url).toBeFocused();
      await expect(url).toHaveValue('dQw4w9WgXcQ');
      await expect(name).toHaveValue('Personal');
      await expect(url).toHaveAttribute('autocomplete', 'off');
      await expect(name).toHaveAttribute('autocomplete', 'off');
      await expect(
        page.getByText('Changes apply to every playlist using this stream.')
      ).toBeVisible();
      if (mobile) {
        await expect(url).toHaveCSS('font-size', '16px');
        await expect(name).toHaveCSS('font-size', '16px');
      }
      await url.press('Shift+Tab');
      await expect(save).toBeFocused();
      await save.press('Tab');
      await expect(url).toBeFocused();
      await url.fill('bad');
      await save.click();
      await expect(page.getByRole('alert')).toHaveText(
        'Please enter a valid YouTube video ID or URL'
      );
      await url.press('Escape');
      await expect(editor).toBeFocused();
      await expect(page.getByRole('dialog', { name: 'Stream settings' })).toBeVisible();
      await editor.click();
      await name.fill('Discarded');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(editor).toBeFocused();
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')))
      ).toEqual(SAVED);

      // Renaming must retain the existing player; a URL change must replace only that player.
      const personalFrame = await page.locator('iframe[title="Personal"]').elementHandle();
      const catalogFrame = await page.locator('iframe[title="CNN Türk"]').elementHandle();
      await editor.click();
      await name.fill('Renamed');
      await save.click();
      expect(await personalFrame.evaluate((element) => element.isConnected)).toBe(true);
      await page.getByRole('button', { name: 'Edit Renamed', exact: true }).click();
      const existingSrc = await page.locator('iframe[title="CNN Türk"]').getAttribute('src');
      await url.fill(new URL(existingSrc).pathname.split('/').pop());
      await save.click();
      await expect(page.getByRole('alert')).toHaveText('This stream is already in the playlist');
      await url.fill('https://www.youtube.com/watch?v=abcdefghijk');
      await name.fill('Updated');
      await save.click();
      await expect(page.getByRole('button', { name: 'Edit Updated', exact: true })).toBeFocused();
      await expect(page.locator('iframe[title="Updated"]')).toHaveAttribute(
        'src',
        /embed\/abcdefghijk\?/
      );
      expect(await personalFrame.evaluate((element) => element.isConnected)).toBe(false);
      expect(await catalogFrame.evaluate((element) => element.isConnected)).toBe(true);
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('broadcasts:workspace'))
      );
      expect(saved.playlists).toEqual(SAVED.playlists);
      expect(saved.layout).toBe(SAVED.layout);
      expect(saved.customSources[0].id).toBe(PERSONAL_ID);
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await expect(page.getByRole('button', { name: 'Edit Updated', exact: true })).toBeVisible();
      await page.getByLabel('Playlist', { exact: true }).selectOption('default');
      await expect(page.getByRole('button', { name: 'Edit Updated', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await server.close();
    }
  });
}
