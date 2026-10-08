import { useState } from 'react';

export function BrowseStreamsForm({ playlists, streams, onAdd, onCancel }) {
  const [sourceId, setSourceId] = useState(playlists[0]?.id);
  const [selected, setSelected] = useState([]);
  const source = playlists.find((playlist) => playlist.id === sourceId);
  const existingVideos = new Set(streams.map((stream) => stream.playback.videoId));
  const selectedVideos = new Set(selected.map((stream) => stream.playback.videoId));

  function toggle(stream) {
    setSelected((previous) =>
      previous.some((item) => item.playback.videoId === stream.playback.videoId)
        ? previous.filter((item) => item.playback.videoId !== stream.playback.videoId)
        : [...previous, stream]
    );
  }

  return (
    <form
      className="playlist-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) onAdd(selected.map((stream) => stream.id));
      }}
    >
      <h2 id="playlist-title">Browse Streams</h2>
      {playlists.length > 1 ? (
        <select
          className="playlist-select"
          aria-label="Source playlist"
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
        >
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="browse-source-name">{source?.name}</p>
      )}
      <div className="browse-streams" role="group" aria-label="Streams">
        {source?.sources.length ? (
          source.sources.map((stream) => {
            const added = existingVideos.has(stream.playback.videoId);
            return (
              <label key={stream.id} className={`browse-stream${added ? ' already-added' : ''}`}>
                <input
                  type="checkbox"
                  aria-label={stream.label}
                  checked={added || selectedVideos.has(stream.playback.videoId)}
                  disabled={added}
                  onChange={() => toggle(stream)}
                />
                <span className="browse-stream-name">{stream.label}</span>
                {added && <span className="browse-stream-status">Already added</span>}
              </label>
            );
          })
        ) : (
          <p className="browse-empty">No streams in this playlist.</p>
        )}
      </div>
      <div className="playlist-actions">
        <button type="button" className="playlist-action" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="playlist-action playlist-submit"
          disabled={!selected.length}
        >
          {selected.length ? `Add (${selected.length})` : 'Add'}
        </button>
      </div>
    </form>
  );
}
