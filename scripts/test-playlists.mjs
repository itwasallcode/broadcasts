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
  const {
    createPlaylist,
    editCustomSource,
    getStreamEditError,
    deletePlaylist,
    getPlaylistNameError,
    renamePlaylist,
    resetDefaultPlaylist,
    resolveActiveSources,
    sanitizeWorkspace,
    setActivePlaylist,
    addCustomSource,
    addSourcesToActivePlaylist,
    removeFromActivePlaylist,
    reorderActivePlaylist,
  } = await server.ssrLoadModule('/src/utils/workspace.js');
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
      { id: 'default', order: ['cnn-turk', 'custom-dQw4w9WgXcQ', 'a-haber'], hidden: ['halk-tv'] },
    ],
  };
  const ids = (workspace) => resolveActiveSources(workspace, catalog).map((source) => source.id);

  await test('existing preferences survive loading and creating an empty list', () => {
    assert.deepEqual(sanitizeWorkspace(structuredClone(saved), catalog), saved);
    const next = createPlaylist(saved, catalog, { id: 'list-one', name: '  Morning  ' });
    assert.equal(next.activePlaylistId, 'list-one');
    assert.equal(next.playlists[1].name, 'Morning');
    assert.deepEqual(ids(next), []);
    assert.deepEqual(next.playlists[0], saved.playlists[0]);
    assert.deepEqual(next.customSources, saved.customSources);
    assert.equal(next.layout, '3x0');
    assert.deepEqual(sanitizeWorkspace(JSON.parse(JSON.stringify(next)), catalog), next);
  });

  await test('copying includes the current order and excludes hidden streams', () => {
    let next = createPlaylist(saved, catalog, {
      id: 'list-one',
      name: 'Morning',
      copyCurrent: true,
    });
    assert.deepEqual(ids(next), ids(saved));
    assert.ok(!ids(next).includes('halk-tv'));
    next = reorderActivePlaylist(next, [...ids(next)].reverse());
    next = removeFromActivePlaylist(next, catalog, 'cnn-turk');
    const personalOrder = ids(next);
    const defaultList = setActivePlaylist(next, 'default');
    assert.deepEqual(ids(defaultList), ids(saved));
    assert.deepEqual(ids(setActivePlaylist(defaultList, 'list-one')), personalOrder);
  });

  await test('resetting the default list keeps copied list order and shared custom streams', () => {
    const copied = createPlaylist(saved, catalog, {
      id: 'list-one',
      name: 'Morning',
      copyCurrent: true,
    });
    const reset = resetDefaultPlaylist(setActivePlaylist(copied, 'default'));
    assert.equal(ids(reset).length, catalog.length);
    assert.deepEqual(ids(setActivePlaylist(reset, 'list-one')), ids(saved));
    assert.deepEqual(reset.customSources, saved.customSources);
  });

  await test('renaming validates names and protects the default list', () => {
    const created = createPlaylist(saved, catalog, { id: 'list-one', name: 'Morning' });
    assert.equal(renamePlaylist(created, 'list-one', ' Daily ').playlists[1].name, 'Daily');
    assert.deepEqual(renamePlaylist(created, 'default', 'Changed'), created);
    assert.deepEqual(renamePlaylist(created, 'list-one', '   '), created);
    assert.deepEqual(
      createPlaylist(created, catalog, { id: 'list-two', name: 'morning' }),
      created
    );
    assert.deepEqual(createPlaylist(created, catalog, { id: 'list-one', name: 'Other' }), created);
    assert.ok(getPlaylistNameError('x'.repeat(61), []));
    assert.ok(
      getPlaylistNameError('turkish streams', [{ id: 'default', name: 'Turkish Streams' }])
    );
    assert.equal(getPlaylistNameError('Morning', created.playlists, 'list-one'), '');
  });

  await test('deleting a list removes only unshared custom sources and falls back safely', () => {
    let next = createPlaylist(saved, catalog, {
      id: 'list-one',
      name: 'Morning',
      copyCurrent: true,
    });
    next = addCustomSource(next, catalog, { videoId: 'abcdefghijk', label: 'Only Here' });
    next = deletePlaylist(next, 'list-one');
    assert.deepEqual(next, saved);
    assert.deepEqual(deletePlaylist(saved, 'default'), saved);
    assert.deepEqual(deletePlaylist(saved, 'missing'), saved);
    assert.deepEqual(setActivePlaylist(saved, 'missing'), saved);
    const withTwo = createPlaylist(
      createPlaylist(saved, catalog, { id: 'list-one', name: 'One' }),
      catalog,
      { id: 'list-two', name: 'Two' }
    );
    assert.equal(deletePlaylist(withTwo, 'list-one').activePlaylistId, 'list-two');
  });
  await test('browsing appends source references without changing source lists or copying videos twice', () => {
    const empty = createPlaylist(saved, catalog, { id: 'target', name: 'Target' });
    const next = addSourcesToActivePlaylist(empty, catalog, [
      'cnn-turk',
      'custom-dQw4w9WgXcQ',
      'cnn-turk',
      'missing',
    ]);
    assert.deepEqual(ids(next), ['cnn-turk', 'custom-dQw4w9WgXcQ']);
    assert.deepEqual(next.playlists[0], saved.playlists[0]);
    assert.deepEqual(next.customSources, saved.customSources);
    assert.deepEqual(sanitizeWorkspace(JSON.parse(JSON.stringify(next)), catalog), next);
    assert.equal(addSourcesToActivePlaylist(next, catalog, ['cnn-turk', 'missing']), next);
    const cnn = catalog.find((source) => source.id === 'cnn-turk');
    const manuallyAdded = addCustomSource(empty, catalog, {
      videoId: cnn.playback.videoId,
      label: 'Same video',
    });
    assert.equal(addSourcesToActivePlaylist(manuallyAdded, catalog, ['cnn-turk']), manuallyAdded);
    const removedFromOrigin = removeFromActivePlaylist(
      setActivePlaylist(next, 'default'),
      catalog,
      'custom-dQw4w9WgXcQ'
    );
    assert.deepEqual(ids(setActivePlaylist(removedFromOrigin, 'target')), ids(next));
    assert.equal(removedFromOrigin.customSources.length, 1);
  });

  await test('editing a shared personal stream preserves IDs, order and saved preferences', () => {
    const before = createPlaylist(saved, catalog, { id: 'copy', name: 'Copy', copyCurrent: true });
    const snapshot = structuredClone(before);
    const next = editCustomSource(before, catalog, 'custom-dQw4w9WgXcQ', {
      videoId: 'abcdefghijk',
      label: 'Updated',
    });
    assert.deepEqual(before, snapshot);
    assert.deepEqual(next.playlists, before.playlists);
    assert.equal(next.layout, before.layout);
    assert.equal(next.activePlaylistId, before.activePlaylistId);
    for (const playlist of next.playlists) {
      const source = resolveActiveSources(setActivePlaylist(next, playlist.id), catalog).find(
        (source) => source.id === 'custom-dQw4w9WgXcQ'
      );
      assert.equal(source.label, 'Updated');
      assert.equal(source.playback.videoId, 'abcdefghijk');
    }
    assert.deepEqual(sanitizeWorkspace(JSON.parse(JSON.stringify(next)), catalog), next);
    const readded = addCustomSource(next, catalog, { videoId: 'dQw4w9WgXcQ', label: 'Original' });
    assert.equal(readded.customSources.length, 2);
    assert.notEqual(readded.customSources[0].id, readded.customSources[1].id);
    assert.equal(readded.customSources[0].playback.videoId, 'abcdefghijk');
    assert.equal(readded.customSources[1].playback.videoId, 'dQw4w9WgXcQ');
    const empty = createPlaylist(readded, catalog, { id: 'empty', name: 'Empty' });
    const reused = addCustomSource(empty, catalog, { videoId: 'abcdefghijk', label: 'Ignored' });
    assert.deepEqual(ids(reused), ['custom-dQw4w9WgXcQ']);
    assert.equal(reused.customSources.length, 2);
  });

  await test('editing rejects catalog changes, invalid videos and duplicates in other affected lists', () => {
    const before = createPlaylist(saved, catalog, { id: 'copy', name: 'Copy', copyCurrent: true });
    const other = addCustomSource(before, catalog, { videoId: 'abcdefghijk', label: 'Other' });
    const active = setActivePlaylist(other, 'default');
    for (const [sourceId, videoId] of [
      ['cnn-turk', 'abcdefghijk'],
      ['missing', 'abcdefghijk'],
      ['custom-dQw4w9WgXcQ', 'bad'],
      ['custom-dQw4w9WgXcQ', 'abcdefghijk'],
      ['custom-dQw4w9WgXcQ', catalog.find((source) => source.id === 'cnn-turk').playback.videoId],
    ]) {
      assert.ok(getStreamEditError(active, catalog, sourceId, videoId));
      assert.equal(
        editCustomSource(active, catalog, sourceId, { videoId, label: 'Invalid' }),
        active
      );
    }
    const renamed = editCustomSource(active, catalog, 'custom-dQw4w9WgXcQ', {
      videoId: 'dQw4w9WgXcQ',
      label: 'Renamed',
    });
    assert.equal(renamed.customSources[0].label, 'Renamed');
    assert.deepEqual(renamed.customSources[0].playback, saved.customSources[0].playback);
  });

  await test('browsing restores a hidden default stream without resetting preferences', () => {
    const next = addSourcesToActivePlaylist(saved, catalog, ['halk-tv']);
    assert.deepEqual(ids(next), [...ids(saved), 'halk-tv']);
    assert.deepEqual(next.playlists[0].hidden, []);
    assert.equal(next.layout, saved.layout);
    assert.deepEqual(next.customSources, saved.customSources);
  });
} finally {
  await server.close();
}
