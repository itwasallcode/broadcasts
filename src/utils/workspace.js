import { LAYOUTS } from '@/constants/layouts';

import { sanitizePlayback } from '@/utils/playback';

export const WORKSPACE_VERSION = 1;
export const DEFAULT_PLAYLIST_ID = 'default';
export const CUSTOM_ID_PREFIX = 'custom-';
export const PLAYLIST_NAME_LIMIT = 60;

// Read the default playlist name from the catalog to avoid storing a stale copy.
function createDefaultPlaylist() {
  return { id: DEFAULT_PLAYLIST_ID, order: [], hidden: [] };
}

export function createDefaultWorkspace(defaultLayout = '3x3') {
  return {
    version: WORKSPACE_VERSION,
    layout: defaultLayout,
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

export function sanitizeWorkspace(parsed, catalog, defaultLayout = '3x3') {
  if (!parsed || typeof parsed !== 'object' || parsed.version !== WORKSPACE_VERSION) {
    return createDefaultWorkspace(defaultLayout);
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
    layout: Object.hasOwn(LAYOUTS, parsed.layout) ? parsed.layout : defaultLayout,
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

export function getPlaylistNameError(name, playlists, exceptId) {
  if (typeof name !== 'string' || !name.trim()) return 'Enter a playlist name.';
  const trimmed = name.trim();
  if (trimmed.length > PLAYLIST_NAME_LIMIT)
    return `Use ${PLAYLIST_NAME_LIMIT} characters or fewer.`;
  if (
    playlists.some(
      (playlist) =>
        playlist.id !== exceptId && playlist.name?.trim().toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    return 'A playlist with this name already exists.';
  }
  return '';
}

export function setActivePlaylist(workspace, playlistId) {
  if (!workspace.playlists.some((playlist) => playlist.id === playlistId)) return workspace;
  return { ...workspace, activePlaylistId: playlistId };
}

export function createPlaylist(workspace, catalog, { id, name, copyCurrent = false }) {
  if (typeof id !== 'string' || !id || workspace.playlists.some((playlist) => playlist.id === id))
    return workspace;
  if (getPlaylistNameError(name, workspace.playlists)) return workspace;
  const order = copyCurrent
    ? resolveActiveSources(workspace, catalog).map((source) => source.id)
    : [];
  return {
    ...workspace,
    activePlaylistId: id,
    playlists: [...workspace.playlists, { id, name: name.trim(), order }],
  };
}

export function renamePlaylist(workspace, playlistId, name) {
  if (
    playlistId === DEFAULT_PLAYLIST_ID ||
    getPlaylistNameError(name, workspace.playlists, playlistId)
  )
    return workspace;
  return updatePlaylist(workspace, playlistId, { name: name.trim() });
}

export function deletePlaylist(workspace, playlistId) {
  if (
    playlistId === DEFAULT_PLAYLIST_ID ||
    !workspace.playlists.some((playlist) => playlist.id === playlistId)
  )
    return workspace;
  return dropUnreferencedCustomSources({
    ...workspace,
    activePlaylistId:
      workspace.activePlaylistId === playlistId ? DEFAULT_PLAYLIST_ID : workspace.activePlaylistId,
    playlists: workspace.playlists.filter((playlist) => playlist.id !== playlistId),
  });
}

export function reorderActivePlaylist(workspace, orderedIds) {
  return updatePlaylist(workspace, getActivePlaylist(workspace).id, { order: orderedIds });
}

export function addSourcesToActivePlaylist(workspace, catalog, sourceIds) {
  const available = new Map(
    [...catalog, ...workspace.customSources].map((source) => [source.id, source])
  );
  const current = resolveActiveSources(workspace, catalog);
  const videoIds = new Set(current.map((source) => source.playback.videoId));
  const additions = [];
  for (const id of sourceIds) {
    const source = available.get(id);
    if (!source || videoIds.has(source.playback.videoId)) continue;
    videoIds.add(source.playback.videoId);
    additions.push(id);
  }
  if (!additions.length) return workspace;
  const playlist = getActivePlaylist(workspace);
  const update = { order: [...current.map((source) => source.id), ...additions] };
  if (playlist.id === DEFAULT_PLAYLIST_ID) {
    update.hidden = playlist.hidden.filter((id) => !additions.includes(id));
  }
  return updatePlaylist(workspace, playlist.id, update);
}

export function addCustomSource(workspace, catalog, { videoId, label }) {
  const existing = workspace.customSources.find((source) => source.playback.videoId === videoId);
  const baseId = `${CUSTOM_ID_PREFIX}${videoId}`;
  let id = existing?.id ?? baseId;
  // Edited sources keep their IDs; their original video can be added again independently.
  for (
    let suffix = 2;
    !existing && workspace.customSources.some((source) => source.id === id);
    suffix++
  ) {
    id = `${baseId}-${suffix}`;
  }
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

export function getStreamEditError(workspace, catalog, sourceId, videoId) {
  if (!workspace.customSources.some((source) => source.id === sourceId))
    return 'Only personal streams can be edited.';
  if (!sanitizePlayback({ provider: 'youtube', kind: 'video', videoId }))
    return 'Please enter a valid YouTube video ID or URL';
  for (const playlist of workspace.playlists) {
    if (!playlist.order.includes(sourceId)) continue;
    const sources = resolveActiveSources({ ...workspace, activePlaylistId: playlist.id }, catalog);
    if (sources.some((source) => source.id !== sourceId && source.playback.videoId === videoId))
      return 'This stream is already in a playlist that uses it.';
  }
  return '';
}

export function editCustomSource(workspace, catalog, sourceId, { videoId, label }) {
  if (getStreamEditError(workspace, catalog, sourceId, videoId)) return workspace;
  return {
    ...workspace,
    customSources: workspace.customSources.map((source) =>
      source.id === sourceId
        ? { ...source, label, playback: { ...source.playback, videoId } }
        : source
    ),
  };
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
