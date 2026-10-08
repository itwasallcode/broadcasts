import { expect, test } from '@playwright/test';

import { blockExternalRequests, startServer } from './helpers/server.mjs';

const LEGACY = {
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
  ],
};

for (const width of [390, 1280]) {
  test(`personal list lifecycle preserves other lists at ${width}px`, async ({ page, context }) => {
    const server = await startServer(width === 390 ? '/' : '/broadcasts/');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await blockExternalRequests(context, server.url);
      await page.setViewportSize({ width, height: 844 });
      await page.goto(server.url);
      await page.evaluate(
        (workspace) => localStorage.setItem('broadcasts:workspace', JSON.stringify(workspace)),
        LEGACY
      );
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      const selector = page.getByLabel('Playlist', { exact: true });
      const names = page.locator('.stream-item-name');
      await expect(selector).toHaveValue('default');
      await expect(selector.locator('option')).toHaveText(['Turkish Streams', 'Create']);
      await expect(names).toHaveCount(9);
      const original = await names.allTextContents();
      await expect(page.getByRole('button', { name: 'Rename', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);

      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
      await expect(page.getByLabel('Playlist name', { exact: true })).toBeFocused();
      await page.getByLabel('Playlist name', { exact: true }).fill('Morning');
      await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
      await expect(selector).toHaveValue(/^playlist-/);
      await expect(selector).toBeFocused();
      await expect(names).toHaveText(original);
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Remove CNN Türk', exact: true }).click();
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Rename', exact: true }).click();
      await page.getByLabel('Playlist name', { exact: true }).fill('Daily');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(selector.locator('option:checked')).toHaveText('Daily');
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await expect(selector.locator('option:checked')).toHaveText('Daily');
      await expect(names).toHaveText(original.filter((name) => name !== 'CNN Türk'));

      await selector.selectOption('__create__');
      await page.getByLabel('Playlist name', { exact: true }).fill('Focus');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(names).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Add Stream', exact: true }).click();
      await page.getByLabel('YouTube URL', { exact: true }).fill('dQw4w9WgXcQ');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(names).toHaveText(['Personal']);
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Add Stream', exact: true }).click();
      await page.getByLabel('YouTube URL', { exact: true }).fill('abcdefghijk');
      await page.getByLabel('Stream name').fill('Focus Only');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(names).toHaveText(['Personal', 'Focus Only']);

      page.once('dialog', (dialog) => dialog.dismiss());
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(selector.locator('option:checked')).toHaveText('Focus');
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(selector).toHaveValue('default');
      await expect(names).toHaveText(original);
      await selector.selectOption({ label: 'Daily' });
      await expect(names).toHaveText(original.filter((name) => name !== 'CNN Türk'));
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(selector).toHaveValue('default');
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('broadcasts:workspace')))
      ).toEqual(LEGACY);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await server.close();
    }
  });
}

test('list editor rejects ambiguous names and cancels without closing the menu', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByLabel('Playlist', { exact: true }).selectOption('__create__');
    const input = page.getByLabel('Playlist name', { exact: true });
    await expect(page.getByRole('dialog', { name: 'New Playlist', exact: true })).toBeVisible();
    await input.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(input).toBeFocused();
    await input.fill('turkish streams');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('A playlist with this name already exists.');
    await input.press('Escape');
    await expect(input).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Stream settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(page.getByLabel('Playlist', { exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeFocused();
  } finally {
    await context.close();
    await server.close();
  }
});

test('settings contain default reset and stream entry without expanding the sidebar', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    const actions = page.getByRole('button', { name: 'Playlist actions', exact: true });
    await expect(page.getByLabel('YouTube URL', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Playlist', { exact: true }).locator('hr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Remove CNN Türk', exact: true }).click();
    await actions.click();
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remove CNN Türk', exact: true })).toHaveCount(0);
    await actions.click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remove CNN Türk', exact: true })).toBeVisible();
    await actions.click();
    await page.getByRole('button', { name: 'Add Stream', exact: true }).click();
    const url = page.getByLabel('YouTube URL', { exact: true });
    await expect(url).toBeFocused();
    await url.fill('bad');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Please enter a valid YouTube video ID or URL'
    );
    await url.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Add Stream', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  } finally {
    await context.close();
    await server.close();
  }
});

test('empty names use the numbered placeholders for lists and streams', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    const selector = page.getByLabel('Playlist', { exact: true });
    const actions = page.getByRole('button', { name: 'Playlist actions', exact: true });
    const playlistName = page.getByLabel('Playlist name', { exact: true });
    await selector.selectOption('__create__');
    await expect(playlistName).toHaveAttribute('placeholder', 'Playlist 1');
    await playlistName.fill('   ');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(selector.locator('option:checked')).toHaveText('Playlist 1');
    await selector.selectOption('__create__');
    await expect(playlistName).toHaveAttribute('placeholder', 'Playlist 2');
    await playlistName.fill('Playlist 7');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await actions.click();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(playlistName).toHaveAttribute('placeholder', 'Playlist 8');
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(selector.locator('option:checked')).toHaveText('Playlist 8');
    for (const [video, expected] of [
      ['abcdefghijk', 'Name 1'],
      ['dQw4w9WgXcQ', 'Name 2'],
    ]) {
      await actions.click();
      await page.getByRole('button', { name: 'Add Stream', exact: true }).click();
      await expect(page.getByLabel('Stream name')).toHaveAttribute('placeholder', expected);
      await page.getByLabel('YouTube URL', { exact: true }).fill(video);
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.locator('.stream-item-name').last()).toHaveText(expected);
    }
    await page.reload();
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(selector.locator('option:checked')).toHaveText('Playlist 8');
    await expect(page.locator('.stream-item-name')).toHaveText(['Name 1', 'Name 2']);
  } finally {
    await context.close();
    await server.close();
  }
});

for (const width of [390, 1280]) {
  test(`browsing streams preserves source lists and selections at ${width}px`, async ({
    page,
    context,
  }) => {
    const server = await startServer(width === 390 ? '/' : '/broadcasts/');
    try {
      await blockExternalRequests(context, server.url);
      await page.setViewportSize({ width, height: 844 });
      await page.goto(server.url);
      await page.evaluate(
        (workspace) => localStorage.setItem('broadcasts:workspace', JSON.stringify(workspace)),
        LEGACY
      );
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      const selector = page.getByLabel('Playlist', { exact: true });
      const names = page.locator('.stream-item-name');
      const original = await names.allTextContents();
      const browse = async () => {
        await page.getByRole('button', { name: 'Playlist actions', exact: true }).click();
        await page.getByRole('button', { name: 'Browse Streams', exact: true }).click();
      };
      await selector.selectOption('__create__');
      await page.getByLabel('Playlist name', { exact: true }).fill('Morning');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await browse();
      await expect(page.getByLabel('Source playlist')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
      await expect(page.getByRole('checkbox', { name: 'CNN Türk', exact: true })).toBeFocused();
      await page.getByRole('checkbox', { name: 'CNN Türk', exact: true }).check();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(names).toHaveCount(0);
      await browse();
      await page.getByRole('checkbox', { name: 'CNN Türk', exact: true }).check();
      await page.getByRole('checkbox', { name: 'Personal', exact: true }).check();
      await page.getByRole('button', { name: 'Add (2)', exact: true }).click();
      await expect(names).toHaveText(['CNN Türk', 'Personal']);
      await expect(selector).toBeFocused();
      await browse();
      await expect(page.getByRole('checkbox', { name: 'CNN Türk', exact: true })).toBeDisabled();
      await expect(page.getByRole('checkbox', { name: 'Personal', exact: true })).toBeChecked();
      await expect(page.getByText('Already added', { exact: true })).toHaveCount(2);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      await selector.selectOption('__create__');
      await page.getByLabel('Playlist name', { exact: true }).fill('Evening');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await browse();
      const source = page.getByLabel('Source playlist', { exact: true });
      await expect(source).toBeFocused();
      await source.selectOption({ label: 'Morning' });
      await page.getByRole('checkbox', { name: 'Personal', exact: true }).check();
      await source.selectOption({ label: 'Turkish Streams' });
      await expect(page.getByRole('checkbox', { name: 'Personal', exact: true })).toBeChecked();
      await page.getByRole('checkbox', { name: 'A Haber', exact: true }).check();
      await page.getByRole('button', { name: 'Add (2)', exact: true }).click();
      await expect(names).toHaveText(['Personal', 'A Haber']);
      await page.reload();
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await expect(selector.locator('option:checked')).toHaveText('Evening');
      await expect(names).toHaveText(['Personal', 'A Haber']);
      await selector.selectOption({ label: 'Morning' });
      await expect(names).toHaveText(['CNN Türk', 'Personal']);
      await selector.selectOption('default');
      await expect(names).toHaveText(original);
      const persisted = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('broadcasts:workspace'))
      );
      expect(persisted.playlists[0]).toEqual(LEGACY.playlists[0]);
      expect(persisted.customSources).toEqual(LEGACY.customSources);
      expect(persisted.layout).toBe(LEGACY.layout);
    } finally {
      await context.close();
      await server.close();
    }
  });
}

test('browsing empty lists and already added streams keeps a usable dialog', async ({
  page,
  context,
}) => {
  const server = await startServer();
  try {
    await blockExternalRequests(context, server.url);
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    const selector = page.getByLabel('Playlist', { exact: true });
    const actions = page.getByRole('button', { name: 'Playlist actions', exact: true });
    await selector.selectOption('__create__');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await selector.selectOption('default');
    await actions.click();
    await page.getByRole('button', { name: 'Browse Streams', exact: true }).click();
    await expect(page.getByText('No streams in this playlist.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await actions.click();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await actions.click();
    await page.getByRole('button', { name: 'Browse Streams', exact: true }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(9);
    await expect(page.locator('.browse-streams input:disabled')).toHaveCount(9);
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(selector).toBeFocused();
  } finally {
    await context.close();
    await server.close();
  }
});
