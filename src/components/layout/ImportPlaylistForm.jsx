import { useRef, useState } from 'react';

import { MAX_TRANSFER_BYTES, parsePlaylistImport } from '@/utils/playlistTransfer';

export function ImportPlaylistForm({ onImport, onClose }) {
  const [importData, setImportData] = useState(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState('');
  const selectionRef = useRef(0);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    const selection = ++selectionRef.current;
    setFileName(file?.name ?? '');
    setImportData(null);
    setError('');
    setReading(Boolean(file));
    if (!file) return;
    try {
      if (file.size > MAX_TRANSFER_BYTES) throw new Error('Choose a file smaller than 1 MB.');
      const parsed = parsePlaylistImport(await file.text());
      if (selection === selectionRef.current) setImportData(parsed);
    } catch (error) {
      if (selection === selectionRef.current)
        setError(error.message || 'Could not read this file. Try again.');
    } finally {
      if (selection === selectionRef.current) setReading(false);
    }
  }

  function handleImport(event) {
    event.preventDefault();
    if (!importData || reading) return;
    const error = onImport(importData);
    if (error) setError(error);
    else onClose();
  }

  return (
    <form className="playlist-editor" onSubmit={handleImport}>
      <h2 id="playlist-title">Import</h2>
      <p className="import-description">Add an exported playlist to your collection.</p>
      <label className="import-file-picker" htmlFor="import-file">
        <svg
          className="import-file-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
          <path d="M14 3v6h6M12 17v-5m-3 3 3-3 3 3" />
        </svg>
        <span className="import-file-copy">
          <span className="import-file-name" title={fileName || undefined}>
            {fileName || 'Choose File'}
          </span>
          <span className="import-file-hint">
            {fileName ? 'Choose another file' : 'JSON · Up to 1 MB'}
          </span>
        </span>
        <input
          id="import-file"
          aria-label="JSON File"
          type="file"
          accept=".json,application/json"
          className="import-file"
          onChange={handleFile}
          aria-describedby="import-status"
        />
      </label>
      <div id="import-status" aria-live="polite">
        {reading && <p className="import-description">Reading file…</p>}
        {importData && (
          <>
            <p className="import-description import-summary">
              <strong>{importData.name}</strong> · {importData.streams.length}{' '}
              {importData.streams.length === 1 ? 'stream' : 'streams'}
            </p>
            <p className="import-description">
              Adds a new playlist. Your existing playlists stay unchanged.
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="playlist-error" role="alert">
          {error}
        </p>
      )}
      <div className="playlist-actions">
        <button type="button" className="playlist-action" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="playlist-action playlist-submit"
          disabled={!importData || reading}
        >
          Import
        </button>
      </div>
    </form>
  );
}
