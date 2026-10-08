import { useCallback, useState } from 'react';

import { extractYouTubeId } from '@/utils/extractYouTubeId';
import { nextNumberedName } from '@/utils/nextNumberedName';

export function AddStreamForm({ streams, onAddStream, onCancel }) {
  const [newStreamInput, setNewStreamInput] = useState('');
  const [newStreamName, setNewStreamName] = useState('');
  const [addError, setAddError] = useState('');
  const suggestedName = nextNumberedName(
    streams.map((stream) => stream.label),
    'Name'
  );

  const handleStreamInputChange = useCallback((e) => {
    setNewStreamInput(e.target.value);
    setAddError('');
  }, []);

  const handleStreamNameChange = useCallback((e) => {
    setNewStreamName(e.target.value);
    setAddError('');
  }, []);

  const handleAddStream = useCallback(
    (e) => {
      e.preventDefault();
      setAddError('');

      const id = extractYouTubeId(newStreamInput);
      if (!id) {
        setAddError('Please enter a valid YouTube video ID or URL');
        return;
      }

      if (streams.some((s) => s.playback.videoId === id)) {
        setAddError('This stream is already in the playlist');
        return;
      }

      onAddStream(id, newStreamName.trim() || suggestedName);
      setNewStreamInput('');
      setNewStreamName('');
    },
    [newStreamInput, newStreamName, streams, onAddStream, suggestedName]
  );

  return (
    <form autoComplete="off" className="playlist-editor" onSubmit={handleAddStream}>
      <h2 id="playlist-title">Add Stream</h2>
      <label htmlFor="stream-url" className="playlist-field-label">
        YouTube URL
      </label>
      <input
        id="stream-url"
        aria-label="YouTube URL"
        type="text"
        className="playlist-name-input"
        autoComplete="off"
        value={newStreamInput}
        onChange={handleStreamInputChange}
        aria-describedby={addError ? 'stream-error' : undefined}
        aria-invalid={Boolean(addError)}
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
        value={newStreamName}
        onChange={handleStreamNameChange}
      />
      {addError && (
        <p id="stream-error" className="playlist-error" role="alert">
          {addError}
        </p>
      )}
      <div className="playlist-actions">
        <button type="button" className="playlist-action" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="playlist-action playlist-submit">
          Add
        </button>
      </div>
    </form>
  );
}
