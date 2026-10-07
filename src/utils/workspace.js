import { LAYOUTS } from '@/constants/layouts';

import { sanitizePlayback } from '@/utils/playback';

export const WORKSPACE_VERSION = 1;
export const DEFAULT_PLAYLIST_ID = 'default';
export const CUSTOM_ID_PREFIX = 'custom-';

// Read the default playlist name from the catalog to avoid storing a stale copy.
function createDefaultPlaylist() {
  return { id: DEFAULT_PLAYLIST_ID, order: [], hidden: [] };
}

export function createDefaultWorkspace() {
  return {
    version: WORKSPACE_VERSION,
    layout: '3x3',
    activePlaylistId: DEFAULT_PLAYLIST_ID,
    customSources: [],
    playlists: [createDefaultPlaylist()],
  };
}

function sanitizeCustomSources(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const sources = [];
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !item.id.startsWith(CUSTOM_ID_PREFIX)) continue;
    if (seen.has(item.id)) continue;
    const playback = sanitizePlayback(item.playback);
    if (!playback) continue;
    seen.add(item.id);
    sources.push({
      id: item.id,
      label: typeof item.label === 'string' ? item.label : '',
      playback,
    });
  }
  return sources;
}

function sanitizeIdList(value, knownIds) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const ids = [];
  for (const id of value) {
    if (typeof id !== 'string' || !knownIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function sanitizePlaylists(value, catalogIds, knownIds) {
  const playlists = [];
  const seen = new Set();
  const items = Array.isArray(value) ? value : [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || item.id === '' || seen.has(item.id)) continue;
    if (item.id === DEFAULT_PLAYLIST_ID) {
      seen.add(item.id);
      playlists.push({
        id: DEFAULT_PLAYLIST_ID,
        order: sanitizeIdList(item.order, knownIds),
        hidden: sanitizeIdList(item.hidden, catalogIds),
      });
      continue;
    }
    if (typeof item.name !== 'string' || item.name.trim() === '') continue;
    seen.add(item.id);
    playlists.push({
      id: item.id,
      name: item.name,
      order: sanitizeIdList(item.order, knownIds),
    });
  }
  if (!playlists.some((p) => p.id === DEFAULT_PLAYLIST_ID)) {
    playlists.unshift(createDefaultPlaylist());
  }
  return playlists;
}

export function sanitizeWorkspace(parsed, catalog) {
  if (!parsed || typeof parsed !== 'object' || parsed.version !== WORKSPACE_VERSION) {
    return createDefaultWorkspace();
  }
  const customSources = sanitizeCustomSources(parsed.customSources);
  const catalogIds = new Set(catalog.map((source) => source.id));
  const knownIds = new Set([...catalogIds, ...customSources.map((source) => source.id)]);
  const playlists = sanitizePlaylists(parsed.playlists, catalogIds, knownIds);
  const activePlaylistId = playlists.some((p) => p.id === parsed.activePlaylistId)
    ? parsed.activePlaylistId
    : DEFAULT_PLAYLIST_ID;
  return {
    version: WORKSPACE_VERSION,
    layout: Object.hasOwn(LAYOUTS, parsed.layout) ? parsed.layout : '3x3',
    activePlaylistId,
    customSources,
    playlists,
  };
}

export function getActivePlaylist(workspace) {
  return (
    workspace.playlists.find((p) => p.id === workspace.activePlaylistId) ?? workspace.playlists[0]
  );
}

// Default playlist merges catalog + order + hidden; custom playlists use order only.
export function resolveActiveSources(workspace, catalog) {
  const byId = new Map(catalog.map((source) => [source.id, source]));
  for (const source of workspace.customSources) byId.set(source.id, source);
  const playlist = getActivePlaylist(workspace);
  const ordered = playlist.order.map((id) => byId.get(id)).filter(Boolean);
  if (playlist.id !== DEFAULT_PLAYLIST_ID) return ordered;
  const inOrder = new Set(playlist.order);
  const hidden = new Set(playlist.hidden);
  const appended = catalog.filter((source) => !inOrder.has(source.id));
  return [...ordered, ...appended].filter((source) => !hidden.has(source.id));
}

function updatePlaylist(workspace, playlistId, update) {
  return {
    ...workspace,
    playlists: workspace.playlists.map((p) => (p.id === playlistId ? { ...p, ...update } : p)),
  };
}

function dropUnreferencedCustomSources(workspace) {
  const referenced = new Set();
  for (const playlist of workspace.playlists) {
    for (const id of playlist.order) referenced.add(id);
  }
  return {
    ...workspace,
    customSources: workspace.customSources.filter((source) => referenced.has(source.id)),
  };
}

function materializeOrder(playlist, catalog) {
  if (playlist.id !== DEFAULT_PLAYLIST_ID) return playlist.order;
  const inOrder = new Set(playlist.order);
  const hidden = new Set(playlist.hidden);
  return [
    ...playlist.order,
    ...catalog.map((source) => source.id).filter((id) => !inOrder.has(id) && !hidden.has(id)),
  ];
}

export function setWorkspaceLayout(workspace, layout) {
  return Object.hasOwn(LAYOUTS, layout) ? { ...workspace, layout } : workspace;
}

export function reorderActivePlaylist(workspace, orderedIds) {
  return updatePlaylist(workspace, getActivePlaylist(workspace).id, { order: orderedIds });
}

export function addCustomSource(workspace, catalog, { videoId, label }) {
  const id = `${CUSTOM_ID_PREFIX}${videoId}`;
  const playlist = getActivePlaylist(workspace);
  let next = workspace;
  if (!next.customSources.some((source) => source.id === id)) {
    next = {
      ...next,
      customSources: [
        ...next.customSources,
        { id, label, playback: { provider: 'youtube', kind: 'video', videoId } },
      ],
    };
  }
  const order = materializeOrder(playlist, catalog);
  if (order.includes(id)) return next;
  return updatePlaylist(next, playlist.id, { order: [...order, id] });
}

export function removeFromActivePlaylist(workspace, catalog, sourceId) {
  const playlist = getActivePlaylist(workspace);
  const order = materializeOrder(playlist, catalog).filter((id) => id !== sourceId);
  const isCatalogSource = catalog.some((source) => source.id === sourceId);
  let next;
  if (playlist.id === DEFAULT_PLAYLIST_ID && isCatalogSource) {
    const hidden = playlist.hidden.includes(sourceId)
      ? playlist.hidden
      : [...playlist.hidden, sourceId];
    next = updatePlaylist(workspace, playlist.id, { order, hidden });
  } else {
    next = updatePlaylist(workspace, playlist.id, { order });
  }
  return dropUnreferencedCustomSources(next);
}

export function resetDefaultPlaylist(workspace) {
  const next = updatePlaylist(workspace, DEFAULT_PLAYLIST_ID, { order: [], hidden: [] });
  return dropUnreferencedCustomSources(next);
}
