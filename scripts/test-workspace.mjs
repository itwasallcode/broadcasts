import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { test } from 'node:test';
import { createServer } from 'vite';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/turkish-streams.json', import.meta.url))
).sources;
const server = await createServer({
  server: { middlewareMode: true, ws: false },
  logLevel: 'error',
});

try {
  const { sanitizeWorkspace, resolveActiveSources } =
    await server.ssrLoadModule('/src/utils/workspace.js');
  const saved = {
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
      {
        id: 'default',
        order: ['cnn-turk', 'custom-dQw4w9WgXcQ', 'a-haber'],
        hidden: ['halk-tv'],
      },
      { id: 'personal', name: 'My List', order: ['custom-dQw4w9WgXcQ', 'cnn-turk'] },
    ],
  };

  await test('loading a saved workspace preserves preferences and personal playlists', () => {
    const restored = sanitizeWorkspace(JSON.parse(JSON.stringify(saved)), catalog, '3x3');
    assert.deepEqual(restored, saved);
    const personal = { ...saved, activePlaylistId: 'personal' };
    assert.deepEqual(sanitizeWorkspace(personal, catalog), personal);
    assert.deepEqual(
      resolveActiveSources(personal, catalog).map((source) => source.id),
      personal.playlists[1].order
    );
  });

  await test('a catalog video replacement keeps preferences and uses the new video', () => {
    const updatedCatalog = structuredClone(catalog);
    updatedCatalog.find((source) => source.id === 'cnn-turk').playback.videoId = 'abcdefghijk';
    const restored = sanitizeWorkspace(saved, updatedCatalog);
    const streams = resolveActiveSources(restored, updatedCatalog);
    assert.deepEqual(restored, saved);
    assert.deepEqual(
      streams.slice(0, 3).map((source) => source.id),
      saved.playlists[0].order
    );
    assert.equal(streams[0].playback.videoId, 'abcdefghijk');
    assert.ok(!streams.some((source) => source.id === 'halk-tv'));
    assert.deepEqual(streams[1], saved.customSources[0]);
  });
} finally {
  await server.close();
}
