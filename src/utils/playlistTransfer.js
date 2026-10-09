import { sanitizePlayback } from '@/utils/playback';
import {
  CUSTOM_ID_PREFIX,
  DEFAULT_PLAYLIST_ID,
  PLAYLIST_NAME_LIMIT,
  getActivePlaylist,
  resolveActiveSources,
} from '@/utils/workspace';

export const MAX_TRANSFER_BYTES = 1024 * 1024;
const FORMAT = 'broadcasts-playlist';
const TRANSFER_VERSION = 1;
const INVALID_FILE = 'This file is not a valid Broadcasts playlist export.';

function requireValid(condition) {
  if (!condition) throw new Error(INVALID_FILE);
}

export function serializePlaylistExport(workspace, catalog, defaultPlaylistName) {
  const active = getActivePlaylist(workspace);
  const catalogIds = new Set(catalog.map((source) => source.id));
  const playlist = {
    name: active.id === DEFAULT_PLAYLIST_ID ? defaultPlaylistName : active.name,
    streams: resolveActiveSources(workspace, catalog).map((source) => ({
      ...(catalogIds.has(source.id) ? { catalogId: source.id } : {}),
      label: source.label,
      playback: source.playback,
    })),
  };
  const text = JSON.stringify({ format: FORMAT, version: TRANSFER_VERSION, playlist }, null, 2);
  if (new globalThis.Blob([text]).size > MAX_TRANSFER_BYTES)
    throw new Error('This export exceeds the 1 MB file limit.');
  return text;
}

export function parsePlaylistImport(text) {
  if (new globalThis.Blob([text]).size > MAX_TRANSFER_BYTES)
    throw new Error('Choose a file smaller than 1 MB.');
  let exported;
  try {
    exported = JSON.parse(text);
  } catch {
    throw new Error(INVALID_FILE);
  }
  requireValid(exported?.format === FORMAT);
  if (exported.version !== TRANSFER_VERSION)
    throw new Error('This file version is not supported. Check for app updates.');
  const value = exported.playlist;
  requireValid(
    typeof value?.name === 'string' &&
      Boolean(value.name.trim()) &&
      value.name.trim().length <= PLAYLIST_NAME_LIMIT
  );
  requireValid(Array.isArray(value.streams));
  const catalogIds = new Set();
  const streams = value.streams.map((source) => {
    requireValid(source && typeof source.label === 'string');
    const playback = sanitizePlayback(source.playback);
    requireValid(playback);
    if (source.catalogId !== undefined) {
      requireValid(
        typeof source.catalogId === 'string' &&
          source.catalogId.length > 0 &&
          !source.catalogId.startsWith(CUSTOM_ID_PREFIX) &&
          !catalogIds.has(source.catalogId)
      );
      catalogIds.add(source.catalogId);
    }
    return {
      ...(source.catalogId !== undefined ? { catalogId: source.catalogId } : {}),
      label: source.label,
      playback,
    };
  });
  return { name: value.name.trim(), streams };
}

export function importPlaylist(workspace, catalog, playlist, { id, defaultPlaylistName }) {
  const names = new Set(
    workspace.playlists.map((item) =>
      (item.id === DEFAULT_PLAYLIST_ID ? defaultPlaylistName : item.name).trim().toLowerCase()
    )
  );
  let name = playlist.name;
  for (let suffix = 2; names.has(name.toLowerCase()); suffix++) {
    const ending = ` (${suffix})`;
    name = `${playlist.name.slice(0, PLAYLIST_NAME_LIMIT - ending.length).trimEnd()}${ending}`;
  }
  const catalogIds = new Set(catalog.map((source) => source.id));
  const usedIds = new Set(workspace.customSources.map((source) => source.id));
  const additions = [];
  const order = playlist.streams.map((source, index) => {
    if (catalogIds.has(source.catalogId)) return source.catalogId;
    // Imported personal streams are independent of existing playlists, even when videos match.
    const baseId = `${CUSTOM_ID_PREFIX}${id}-${index}`;
    let sourceId = baseId;
    for (let suffix = 2; usedIds.has(sourceId); suffix++) sourceId = `${baseId}-${suffix}`;
    usedIds.add(sourceId);
    additions.push({ id: sourceId, label: source.label, playback: source.playback });
    return sourceId;
  });
  return {
    ...workspace,
    activePlaylistId: id,
    customSources: [...workspace.customSources, ...additions],
    playlists: [...workspace.playlists, { id, name, order }],
  };
}

export function downloadPlaylistExport(workspace, catalog, defaultPlaylistName) {
  const blob = new globalThis.Blob(
    [serializePlaylistExport(workspace, catalog, defaultPlaylistName)],
    { type: 'application/json' }
  );
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `broadcasts-playlist-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Allow mobile browsers to start the download before releasing the object URL.
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  }
}
