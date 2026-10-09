import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { test } from 'node:test';
import { createServer } from 'vite';

const data = JSON.parse(
  await readFile(new URL('../src/data/turkish-streams.json', import.meta.url))
);
const catalog = data.sources;
const server = await createServer({
  server: { middlewareMode: true, ws: false },
  logLevel: 'error',
});
try {
  const { serializePlaylistExport, parsePlaylistImport, importPlaylist, MAX_TRANSFER_BYTES } =
    await server.ssrLoadModule('/src/utils/playlistTransfer.js');
  const { resolveActiveSources, sanitizeWorkspace, editCustomSource } =
    await server.ssrLoadModule('/src/utils/workspace.js');
  const saved = {
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
  const serialize = (workspace) => serializePlaylistExport(workspace, catalog, data.name);
  const add = (workspace, playlist, id = 'imported') =>
    importPlaylist(workspace, catalog, playlist, { id, defaultPlaylistName: data.name });
  await test('exports only the selected playlist and preserves its stream order', () => {
    const payload = JSON.parse(serialize(saved));
    assert.deepEqual(Object.keys(payload), ['format', 'version', 'playlist']);
    assert.equal(payload.playlist.name, 'Morning');
    assert.deepEqual(
      payload.playlist.streams.map((s) => s.label),
      ['Personal', 'CNN Türk']
    );
    assert.equal(payload.playlist.streams[1].catalogId, 'cnn-turk');
    assert.equal(payload.playlist.streams[0].catalogId, undefined);
    assert.equal(payload.playlist.layout, undefined);
    const defaults = parsePlaylistImport(serialize({ ...saved, activePlaylistId: 'default' }));
    assert.equal(defaults.name, data.name);
    assert.deepEqual(
      defaults.streams.map((s) => s.label),
      resolveActiveSources({ ...saved, activePlaylistId: 'default' }, catalog).map((s) => s.label)
    );
    assert.ok(!defaults.streams.some((s) => s.catalogId === 'halk-tv'));
  });
  await test('import appends an independent playlist, resolves name collisions and preserves preferences', () => {
    const snapshot = structuredClone(saved);
    const parsed = parsePlaylistImport(serialize(saved));
    const next = add(saved, parsed);
    assert.deepEqual(saved, snapshot);
    assert.equal(next.layout, saved.layout);
    assert.equal(next.activePlaylistId, 'imported');
    assert.deepEqual(next.playlists.slice(0, 2), saved.playlists);
    assert.deepEqual(next.customSources[0], saved.customSources[0]);
    assert.equal(next.playlists[2].name, 'Morning (2)');
    assert.deepEqual(
      resolveActiveSources(next, catalog).map((s) => s.label),
      ['Personal', 'CNN Türk']
    );
    assert.deepEqual(sanitizeWorkspace(JSON.parse(JSON.stringify(next)), catalog), next);
    const edited = editCustomSource(next, catalog, next.playlists[2].order[0], {
      videoId: 'dQw4w9WgXcQ',
      label: 'Edited',
    });
    assert.deepEqual(edited.customSources[0], saved.customSources[0]);
    assert.equal(add(next, parsed, 'another').playlists[3].name, 'Morning (3)');
    assert.equal(
      add(saved, { name: data.name, streams: [] }).playlists[2].name,
      `${data.name} (2)`
    );
    const long = {
      ...saved,
      playlists: [...saved.playlists, { id: 'long', name: 'x'.repeat(60), order: [] }],
    };
    assert.equal(
      add(long, { name: 'x'.repeat(60), streams: [] }).playlists[3].name,
      `${'x'.repeat(56)} (2)`
    );
  });
  await test('known catalog streams use current data and missing catalog streams retain portable playback', () => {
    const parsed = parsePlaylistImport(serialize(saved));
    const current = catalog.map((s) =>
      s.id === 'cnn-turk' ? { ...s, playback: { ...s.playback, videoId: 'dQw4w9WgXcQ' } } : s
    );
    const next = importPlaylist(saved, current, parsed, {
      id: 'imported',
      defaultPlaylistName: data.name,
    });
    assert.equal(resolveActiveSources(next, current)[1].playback.videoId, 'dQw4w9WgXcQ');
    const missing = catalog.filter((s) => s.id !== 'cnn-turk');
    const fallback = importPlaylist(saved, missing, parsed, {
      id: 'imported',
      defaultPlaylistName: data.name,
    });
    assert.equal(
      resolveActiveSources(fallback, missing)[1].playback.videoId,
      parsed.streams[1].playback.videoId
    );
  });
  await test('invalid, oversized, full-workspace and unsupported exports are rejected', () => {
    for (const text of [
      'bad',
      '{}',
      'null',
      '[]',
      JSON.stringify({ format: 'broadcasts-workspace', version: 1, workspace: saved }),
      ' '.repeat(MAX_TRANSFER_BYTES + 1),
    ])
      assert.throws(() => parsePlaylistImport(text));
    const payload = JSON.parse(serialize(saved));
    for (const modify of [
      (p) => {
        p.version = 99;
      },
      (p) => {
        p.playlist = null;
      },
      (p) => {
        p.playlist.name = ' ';
      },
      (p) => {
        p.playlist.name = 'x'.repeat(61);
      },
      (p) => {
        p.playlist.streams = null;
      },
      (p) => {
        p.playlist.streams[0] = null;
      },
      (p) => {
        p.playlist.streams[0].playback.videoId = 'bad';
      },
      (p) => {
        p.playlist.streams[0].playback.provider = 'html';
      },
      (p) => {
        p.playlist.streams[0].catalogId = 1;
      },
      (p) => {
        p.playlist.streams.push(p.playlist.streams[1]);
      },
    ]) {
      const invalid = structuredClone(payload);
      modify(invalid);
      assert.throws(() => parsePlaylistImport(JSON.stringify(invalid)));
    }
  });
  await test('empty playlists import and untrusted extra properties are discarded', () => {
    assert.deepEqual(add(saved, { name: 'Empty', streams: [] }).playlists[2].order, []);
    const payload = JSON.parse(serialize(saved));
    payload.playlist.streams[0].channelUrl = 'javascript:alert(1)';
    payload.playlist.streams[0].playback.src = 'https://example.com';
    assert.deepEqual(
      parsePlaylistImport(JSON.stringify(payload)),
      parsePlaylistImport(serialize(saved))
    );
  });
} finally {
  await server.close();
}
