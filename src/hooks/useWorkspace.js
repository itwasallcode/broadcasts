import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MOBILE_VIEWPORT } from '@/constants/media';

import catalogData from '@/data/turkish-streams.json';

import { downloadPlaylistExport, importPlaylist } from '@/utils/playlistTransfer';
import {
  DEFAULT_PLAYLIST_ID,
  addCustomSource,
  addSourcesToActivePlaylist,
  createDefaultWorkspace,
  createPlaylist,
  deletePlaylist,
  editCustomSource,
  getStreamEditError,
  removeFromActivePlaylist,
  renamePlaylist,
  reorderActivePlaylist,
  resetDefaultPlaylist,
  resolveActiveSources,
  sanitizeWorkspace,
  setActivePlaylist,
  setWorkspaceLayout,
} from '@/utils/workspace';

const WORKSPACE_KEY = 'broadcasts:workspace';
const catalog = catalogData.sources;

function loadInitialWorkspace() {
  const defaultLayout = window.matchMedia(MOBILE_VIEWPORT).matches ? '3x0' : '3x3';
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY));
    return sanitizeWorkspace(parsed, catalog, defaultLayout);
  } catch {
    return createDefaultWorkspace(defaultLayout);
  }
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState(loadInitialWorkspace);

  const [saveFailed, setSaveFailed] = useState(false);
  const savedWorkspaceRef = useRef(null);

  const onRetrySave = useCallback(() => {
    if (savedWorkspaceRef.current === workspace) return true;
    try {
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
      savedWorkspaceRef.current = workspace;
      setSaveFailed(false);
      return true;
    } catch {
      setSaveFailed(true);
      return false;
    }
  }, [workspace]);

  useEffect(() => {
    // Report the result of synchronizing with browser storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onRetrySave();
  }, [onRetrySave]);

  const streams = useMemo(() => resolveActiveSources(workspace, catalog), [workspace]);

  const playlists = useMemo(
    () =>
      workspace.playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.id === DEFAULT_PLAYLIST_ID ? catalogData.name : playlist.name,
        sources: resolveActiveSources({ ...workspace, activePlaylistId: playlist.id }, catalog),
      })),
    [workspace]
  );

  const onPlaylistChange = useCallback((playlistId) => {
    setWorkspace((prev) => setActivePlaylist(prev, playlistId));
  }, []);

  const onCreatePlaylist = useCallback((name, copyCurrent) => {
    const id = `playlist-${window.crypto.randomUUID()}`;
    setWorkspace((prev) => createPlaylist(prev, catalog, { id, name, copyCurrent }));
  }, []);

  const onRenamePlaylist = useCallback((name) => {
    setWorkspace((prev) => renamePlaylist(prev, prev.activePlaylistId, name));
  }, []);

  const onDeletePlaylist = useCallback(() => {
    setWorkspace((prev) => deletePlaylist(prev, prev.activePlaylistId));
  }, []);

  const onLayoutChange = useCallback((layout) => {
    setWorkspace((prev) => setWorkspaceLayout(prev, layout));
  }, []);

  const onReorderStreams = useCallback((nextStreams) => {
    setWorkspace((prev) =>
      reorderActivePlaylist(
        prev,
        nextStreams.map((stream) => stream.id)
      )
    );
  }, []);

  const onAddStream = useCallback((videoId, label) => {
    setWorkspace((prev) => addCustomSource(prev, catalog, { videoId, label }));
  }, []);

  const onEditStream = useCallback(
    (sourceId, videoId, label) => {
      const error = getStreamEditError(workspace, catalog, sourceId, videoId);
      if (error) return error;
      setWorkspace((prev) => editCustomSource(prev, catalog, sourceId, { videoId, label }));
      return '';
    },
    [workspace]
  );

  const onAddSources = useCallback((sourceIds) => {
    setWorkspace((prev) => addSourcesToActivePlaylist(prev, catalog, sourceIds));
  }, []);

  const onRemoveStream = useCallback((sourceId) => {
    setWorkspace((prev) => removeFromActivePlaylist(prev, catalog, sourceId));
  }, []);

  const onResetStreams = useCallback(() => {
    setWorkspace((prev) => resetDefaultPlaylist(prev));
  }, []);

  const onExportPlaylist = useCallback(() => {
    try {
      downloadPlaylistExport(workspace, catalog, catalogData.name);
      return '';
    } catch {
      return 'Could not export this playlist. Try again.';
    }
  }, [workspace]);

  const onImportPlaylist = useCallback(
    (playlist) => {
      const nextWorkspace = importPlaylist(workspace, catalog, playlist, {
        id: `playlist-${window.crypto.randomUUID()}`,
        defaultPlaylistName: catalogData.name,
      });
      try {
        // Persist first so a failed import leaves the existing playlists intact.
        window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(nextWorkspace));
      } catch {
        return 'Could not save the imported playlist. Your current playlists have been kept.';
      }
      savedWorkspaceRef.current = nextWorkspace;
      setSaveFailed(false);
      setWorkspace(nextWorkspace);
      return '';
    },
    [workspace]
  );

  return {
    saveFailed,
    onRetrySave,
    playlists,
    activePlaylistId: workspace.activePlaylistId,
    onPlaylistChange,
    onCreatePlaylist,
    onRenamePlaylist,
    onDeletePlaylist,
    layout: workspace.layout,
    onLayoutChange,
    streams,
    onReorderStreams,
    onAddStream,
    onEditStream,
    onAddSources,
    onRemoveStream,
    onResetStreams,
    onExportPlaylist,
    onImportPlaylist,
  };
}
