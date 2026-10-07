import { useCallback, useEffect, useMemo, useState } from 'react';

import catalogData from '@/data/turkish.json';

import {
  addCustomSource,
  createDefaultWorkspace,
  removeFromActivePlaylist,
  reorderActivePlaylist,
  resetDefaultPlaylist,
  resolveActiveSources,
  sanitizeWorkspace,
  setWorkspaceLayout,
} from '@/utils/workspace';

const WORKSPACE_KEY = 'broadcasts:workspace';

const catalog = catalogData.sources;

function loadInitialWorkspace() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY));
    return sanitizeWorkspace(parsed, catalog);
  } catch {
    return createDefaultWorkspace();
  }
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState(loadInitialWorkspace);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
    } catch {
      return;
    }
  }, [workspace]);

  const streams = useMemo(() => resolveActiveSources(workspace, catalog), [workspace]);

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

  const onRemoveStream = useCallback((sourceId) => {
    setWorkspace((prev) => removeFromActivePlaylist(prev, catalog, sourceId));
  }, []);

  const onResetStreams = useCallback(() => {
    setWorkspace((prev) => resetDefaultPlaylist(prev));
  }, []);

  return {
    layout: workspace.layout,
    onLayoutChange,
    streams,
    onReorderStreams,
    onAddStream,
    onRemoveStream,
    onResetStreams,
  };
}
