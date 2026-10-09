import { useCallback, useState } from 'react';

import { extractYouTubeId } from '@/utils/extractYouTubeId';
import { nextNumberedName } from '@/utils/nextNumberedName';

export function StreamForm({ streams, stream, shared = false, onSave, onCancel }) {
  const [streamInput, setStreamInput] = useState(stream?.playback.videoId ?? '');
  const [streamName, setStreamName] = useState(stream?.label ?? '');
  const [error, setError] = useState('');
  const suggestedName = nextNumberedName(
    streams.map((stream) => stream.label),
    'Name'
  );

  const handleStreamInputChange = useCallback((e) => {
    setStreamInput(e.target.value);
    setError('');
  }, []);

  const handleStreamNameChange = useCallback((e) => {
    setStreamName(e.target.value);
    setError('');
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setError('');

      const id = extractYouTubeId(streamInput);
      if (!id) {
        setError('Please enter a valid YouTube video ID or URL');
        return;
      }

      if (streams.some((s) => s.id !== stream?.id && s.playback.videoId === id)) {
        setError('This stream is already in the playlist');
        return;
      }

      const saveError = onSave(id, streamName.trim() || suggestedName);
      if (saveError) {
        setError(saveError);
        return;
      }
      setStreamInput('');
      setStreamName('');
    },
    [streamInput, streamName, streams, stream, onSave, suggestedName]
  );

  return (
    <form autoComplete="off" className="playlist-editor" onSubmit={handleSubmit}>
      <h2 id="playlist-title">{stream ? 'Edit Stream' : 'Add Stream'}</h2>
      {shared && (
        <p className="stream-edit-hint">Changes apply to every playlist using this stream.</p>
      )}
      <label htmlFor="stream-url" className="playlist-field-label">
        YouTube URL
      </label>
      <input
        id="stream-url"
        aria-label="YouTube URL"
        type="text"
        className="playlist-name-input"
        autoComplete="off"
        value={streamInput}
        onChange={handleStreamInputChange}
        aria-describedby={error ? 'stream-error' : undefined}
        aria-invalid={Boolean(error)}
      />
      <label htmlFor="stream-name" className="playlist-field-label">
        Name
      </label>
      <input
        id="stream-name"
        type="text"
        className="playlist-name-input"
        autoComplete="off"
        aria-label="Stream name"
        placeholder={suggestedName}
        value={streamName}
        onChange={handleStreamNameChange}
      />
      {error && (
        <p id="stream-error" className="playlist-error" role="alert">
          {error}
        </p>
      )}
      <div className="playlist-actions">
        <button type="button" className="playlist-action" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="playlist-action playlist-submit">
          {stream ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
