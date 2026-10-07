import { useCallback, useState } from 'react';

import { extractYouTubeId } from '@/utils/extractYouTubeId';

export function AddStreamForm({ streams, onAddStream }) {
  const [newStreamInput, setNewStreamInput] = useState('');
  const [newStreamName, setNewStreamName] = useState('');
  const [addError, setAddError] = useState('');

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
        setAddError('This stream is already in the list');
        return;
      }

      onAddStream(id, newStreamName.trim() || 'Custom');
      setNewStreamInput('');
      setNewStreamName('');
    },
    [newStreamInput, newStreamName, streams, onAddStream]
  );

  return (
    <form className="add-stream-form" onSubmit={handleAddStream}>
      <div className="add-stream-row">
        <input
          type="text"
          className="add-stream-input"
          placeholder="YouTube ID or URL (e.g. dQw4w9wgxcQ)"
          value={newStreamInput}
          onChange={handleStreamInputChange}
        />
        <button type="submit" className="add-stream-btn">
          Add
        </button>
      </div>

      <input
        type="text"
        className="add-stream-name-input"
        placeholder="Name (optional)"
        value={newStreamName}
        onChange={handleStreamNameChange}
      />

      {addError && <div className="add-stream-error">{addError}</div>}
    </form>
  );
}
