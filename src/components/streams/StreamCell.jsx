import { memo, useCallback, useEffect, useState } from 'react';

import { HomeIcon } from '@/components/ui/HomeIcon';

import { useChannelUrl } from '@/hooks/useChannelUrl';

import { buildEmbedUrl } from '@/utils/playback';

const LOAD_TIMEOUT_MS = 15000;

export const StreamCell = memo(function StreamCell({ stream, index, refreshKey = 0 }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState('loading');
  const streamId = stream?.id;
  const channelUrl = useChannelUrl(stream);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
  }, []);

  const handleReload = useCallback((e) => {
    e.stopPropagation();
    setStatus('loading');
    setReloadKey((k) => k + 1);
  }, []);

  // refreshKey: global "Refresh all" — show loading without remounting the iframe.
  useEffect(() => {
    if (refreshKey === 0) return;
    setStatus('loading');
  }, [refreshKey]);

  // reloadKey: per-cell retry/reload — remounts the iframe via key change.
  const frameKey = `${reloadKey}-${refreshKey}`;

  useEffect(() => {
    if (!streamId || status !== 'loading') return undefined;
    const timer = window.setTimeout(() => setStatus('failed'), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [streamId, status, frameKey]);

  if (!stream) {
    return (
      <div className="stream-cell stream-cell-empty" style={{ order: index }}>
        <div className="stream-empty-content">
          <div className="stream-empty-icon">＋</div>
          <div className="stream-empty-main">Empty</div>
          <div className="stream-empty-hint">Open menu to add streams</div>
        </div>
      </div>
    );
  }

  const src = buildEmbedUrl(stream.playback);

  return (
    <div className="stream-cell" style={{ order: index }}>
      {status === 'loading' && (
        <div className="stream-loading">
          <div className="stream-spinner" />
        </div>
      )}
      {status === 'failed' && (
        <div className="stream-failed">
          <p className="stream-failed-text">Stream did not load</p>
          <button className="stream-retry-btn" onClick={handleReload}>
            Retry
          </button>
        </div>
      )}
      <iframe
        key={frameKey}
        src={src}
        title={stream.label || `Stream ${index + 1}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handleLoad}
      />
      <div className="stream-label">
        <span className="stream-label-text">{stream.label}</span>
        {channelUrl ? (
          <a
            className="stream-action-btn"
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open channel home page (opens in a new tab)"
            aria-label={`Open ${stream.label || 'channel'} home page (opens in a new tab)`}
          >
            <HomeIcon />
          </a>
        ) : (
          <button
            className="stream-action-btn"
            disabled
            title="Channel home page unavailable"
            aria-label="Channel home page unavailable"
          >
            <HomeIcon />
          </button>
        )}
        <button
          className="stream-action-btn"
          onClick={handleReload}
          title="Reload stream"
          aria-label="Reload stream"
        >
          ↻
        </button>
      </div>
    </div>
  );
});
