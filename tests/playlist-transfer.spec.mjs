import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';

const WORKSPACE = {
  version: 1,
  layout: '4x0',
  activePlaylistId: 'personal',
  customSources: [
    {
      id: 'custom-original-id',
      label: 'Personal',
      playback: { provider: 'youtube', kind: 'video', videoId: 'abcdefghijk' },
    },
  ],
  playlists: [
    { id: 'default', order: ['cnn-turk', 'custom-original-id'], hidden: ['halk-tv'] },
    { id: 'personal', name: 'Morning', order: ['custom-original-id', 'cnn-turk'] },
  ],
};
const PLAYLIST = {
  name: 'Morning',
  streams: [{ label: 'Personal', playback: WORKSPACE.customSources[0].playback }],
};
const exportFile = (playlist = PLAYLIST) => ({
  name: 'broadcasts.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ format: 'broadcasts-playlist', version: 1, playlist })),
});
async function openImport(page) {
  await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
}
const readWorkspace = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')));

for (const mobile of [true, false]) {
  test(`export transfers only the selected playlist to a new browser on ${mobile ? 'touch' : 'desktop'}`, async ({
    browser,
  }) => {
    const server = await startServer(mobile ? '/' : '/broadcasts/');
    const source = await browser.newContext();
    const target = await browser.newContext({
      viewport: { width: mobile ? 390 : 1280, height: 844 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    try {
      await blockExternalRequests(source, server.url);
      await blockExternalRequests(target, server.url);
      const sourcePage = await source.newPage();
      await sourcePage.goto(server.url);
      await sourcePage.evaluate(
        (workspace) => localStorage.setItem('broadcasts:workspace', JSON.stringify(workspace)),
        WORKSPACE
      );
      await sourcePage.reload();
      await sourcePage.getByRole('button', { name: 'Toggle menu' }).click();
      await sourcePage.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      const downloadPromise = sourcePage.waitForEvent('download');
      await sourcePage.getByRole('button', { name: 'Export', exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^broadcasts-playlist-\d{4}-\d{2}-\d{2}\.json$/);
      const buffer = await readFile(await download.path());
      const exported = JSON.parse(buffer);
      expect(exported.workspace).toBeUndefined();
      expect(exported.playlist.name).toBe('Morning');
      expect(exported.playlist.streams.map((s) => s.label)).toEqual(['Personal', 'CNN Türk']);
      expect(await readWorkspace(sourcePage)).toEqual(WORKSPACE);
      await expect(
        sourcePage.getByRole('button', { name: 'Playlist actions', exact: true })
      ).toBeFocused();

      const page = await target.newPage();
      await page.goto(server.url);
      const before = await readWorkspace(page);
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await openImport(page);
      const file = page.getByLabel('JSON File');
      const submit = page.getByRole('button', { name: 'Import', exact: true });
      await expect(file).toBeFocused();
      await expect(submit).toBeDisabled();
      if (mobile) await expect(file).toHaveCSS('font-size', '16px');
      await file.setInputFiles({
        name: download.suggestedFilename(),
        mimeType: 'application/json',
        buffer,
      });
      await expect(page.getByText('Morning · 2 streams')).toBeVisible();
      await expect(
        page.getByText('Adds a new playlist. Your existing playlists stay unchanged.')
      ).toBeVisible();
      expect(await readWorkspace(page)).toEqual(before);
      await file.press('Shift+Tab');
      await expect(submit).toBeFocused();
      await submit.press('Tab');
      await expect(file).toBeFocused();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
      expect(await readWorkspace(page)).toEqual(before);
      await openImport(page);
      await file.setInputFiles({ name: 'import.json', mimeType: 'application/json', buffer });
      await submit.click();
      await expect(page.getByRole('dialog', { name: 'Import', exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
      await expect(page.getByLabel('Playlist', { exact: true })).toHaveValue(/^playlist-/);
      await expect(page.locator('.stream-item-name')).toHaveText(['Personal', 'CNN Türk']);
      const imported = await readWorkspace(page);
      expect(imported.layout).toBe(before.layout);
      expect(imported.playlists.slice(0, before.playlists.length)).toEqual(before.playlists);
      expect(imported.customSources).toHaveLength(before.customSources.length + 1);
      await page.reload();
      expect(await readWorkspace(page)).toEqual(imported);
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await page.getByLabel('Playlist', { exact: true }).selectOption('default');
      await expect(page.getByRole('button', { name: 'Remove Halk TV', exact: true })).toBeVisible();
      await openImport(page);
      await file.setInputFiles({ name: 'again.json', mimeType: 'application/json', buffer });
      await submit.click();
      await expect(
        page.getByLabel('Playlist', { exact: true }).locator('option:checked')
      ).toHaveText('Morning (2)');
      expect((await readWorkspace(page)).playlists.slice(0, imported.playlists.length)).toEqual(
        imported.playlists
      );
    } finally {
      await source.close();
      await target.close();
      await server.close();
    }
  });
}

test('invalid files and failed persistence leave the existing workspace intact and allow retry', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    const before = await readWorkspace(page);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await openImport(page);
    const file = page.getByLabel('JSON File');
    const submit = page.getByRole('button', { name: 'Import', exact: true });
    await file.setInputFiles(exportFile());
    await expect(submit).toBeEnabled();
    await file.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });
    await expect(page.getByRole('alert')).toHaveText(
      'This file is not a valid Broadcasts playlist export.'
    );
    await expect(submit).toBeDisabled();
    expect(await readWorkspace(page)).toEqual(before);
    await file.setInputFiles({
      name: 'large.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(1024 * 1024 + 1),
    });
    await expect(page.getByRole('alert')).toHaveText('Choose a file smaller than 1 MB.');
    await expect(submit).toBeDisabled();
    await file.press('Escape');
    await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
    await openImport(page);
    await file.setInputFiles(exportFile());
    await expect(submit).toBeEnabled();
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException('Full', 'QuotaExceededError');
      };
    });
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText(
      'Could not save the imported playlist. Your current playlists have been kept.'
    );
    expect(await readWorkspace(page)).toEqual(before);
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
    });
    await submit.click();
    await expect(page.getByRole('dialog', { name: 'Import', exact: true })).toHaveCount(0);
    const imported = await readWorkspace(page);
    expect(imported.playlists.slice(0, before.playlists.length)).toEqual(before.playlists);
    expect(imported.playlists.at(-1).name).toBe('Morning');
    expect(imported.layout).toBe(before.layout);
  } finally {
    await context.close();
    await server.close();
  }
});
