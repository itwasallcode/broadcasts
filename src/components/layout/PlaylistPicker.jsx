import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BrowseStreamsForm } from '@/components/layout/BrowseStreamsForm';
import { StreamForm } from '@/components/layout/StreamForm';
import { SettingsIcon } from '@/components/ui/SettingsIcon';

import { nextNumberedName } from '@/utils/nextNumberedName';
import { DEFAULT_PLAYLIST_ID, PLAYLIST_NAME_LIMIT, getPlaylistNameError } from '@/utils/workspace';

export function PlaylistPicker({
  playlists,
  activePlaylistId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReset,
  streams,
  onAddStream,
  onAddSources,
}) {
  const [mode, setMode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const selectRef = useRef(null);
  const actionsRef = useRef(null);
  const moreRef = useRef(null);
  const dialogRef = useRef(null);
  const active = playlists.find((playlist) => playlist.id === activePlaylistId);
  const suggestedName = nextNumberedName(
    playlists.map((playlist) => playlist.name),
    'Playlist'
  );
  const sourcePlaylists = playlists.filter((playlist) => playlist.id !== activePlaylistId);
  const isDefault = activePlaylistId === DEFAULT_PLAYLIST_ID;

  useEffect(() => {
    if (!mode) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    dialog
      .querySelector('select:not(:disabled), input:not(:disabled), button:not(:disabled)')
      ?.focus();
    return () => dialog.close();
  }, [mode]);

  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event) {
      if (!actionsRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuOpen]);

  function closeEditor() {
    dialogRef.current?.close();
    setMode(null);
    setError('');
    selectRef.current?.focus();
  }

  function openEditor(nextMode) {
    setMenuOpen(false);
    setName(nextMode === 'rename' ? active.name : '');
    setError('');
    setMode(nextMode);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const finalName = name.trim() || suggestedName;
    const nextError = getPlaylistNameError(
      finalName,
      playlists,
      mode === 'rename' ? activePlaylistId : undefined
    );
    if (nextError) {
      setError(nextError);
      inputRef.current?.focus();
      return;
    }
    if (mode === 'rename') onRename(finalName);
    else onCreate(finalName, mode === 'duplicate');
    closeEditor();
  }

  function handleDelete() {
    setMenuOpen(false);
    if (window.confirm(`Delete "${active.name}"? Other playlists will be kept.`)) {
      onDelete();
      selectRef.current?.focus();
    } else moreRef.current?.focus();
  }

  return (
    <div className="playlist-controls">
      <select
        ref={selectRef}
        className="playlist-select"
        aria-label="Playlist"
        value={activePlaylistId}
        onChange={(event) => {
          setMenuOpen(false);
          if (event.target.value === '__create__') openEditor('create');
          else onSelect(event.target.value);
        }}
      >
        {playlists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
        <hr />
        <option value="__create__">Create</option>
      </select>
      <div
        className="playlist-more"
        ref={actionsRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
        onKeyDownCapture={(event) => {
          if (menuOpen && event.key === 'Escape') {
            event.stopPropagation();
            event.preventDefault();
            setMenuOpen(false);
            moreRef.current?.focus();
          }
        }}
      >
        <button
          ref={moreRef}
          type="button"
          className="playlist-more-button"
          aria-label="Playlist actions"
          aria-expanded={menuOpen}
          aria-controls="playlist-actions"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <SettingsIcon />
        </button>
        {menuOpen && (
          <div
            id="playlist-actions"
            className="playlist-popover"
            role="group"
            aria-label="Playlist actions"
          >
            <button type="button" onClick={() => openEditor('add')}>
              Add Stream
            </button>
            {sourcePlaylists.length > 0 && (
              <button type="button" onClick={() => openEditor('browse')}>
                Browse Streams
              </button>
            )}
            {!isDefault && (
              <button type="button" onClick={() => openEditor('rename')}>
                Rename
              </button>
            )}
            <button type="button" onClick={() => openEditor('duplicate')}>
              Duplicate
            </button>
            {isDefault && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onReset();
                  moreRef.current?.focus();
                }}
              >
                Reset
              </button>
            )}
            {!isDefault && (
              <button type="button" className="playlist-delete" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {mode &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="playlist-dialog"
            aria-labelledby="playlist-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const controls = event.currentTarget.querySelectorAll(
                'select:not(:disabled), input:not(:disabled), button:not(:disabled)'
              );
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            onCancel={(event) => {
              event.preventDefault();
              closeEditor();
            }}
          >
            {mode === 'browse' ? (
              <BrowseStreamsForm
                playlists={sourcePlaylists}
                streams={streams}
                onAdd={(sourceIds) => {
                  onAddSources(sourceIds);
                  closeEditor();
                }}
                onCancel={closeEditor}
              />
            ) : mode === 'add' ? (
              <StreamForm
                streams={streams}
                onSave={(id, label) => {
                  onAddStream(id, label);
                  closeEditor();
                }}
                onCancel={closeEditor}
              />
            ) : (
              <form autoComplete="off" className="playlist-editor" onSubmit={handleSubmit}>
                <h2 id="playlist-title">
                  {mode === 'rename'
                    ? 'Rename Playlist'
                    : mode === 'duplicate'
                      ? 'Duplicate Playlist'
                      : 'New Playlist'}
                </h2>
                <label htmlFor="playlist-name" className="playlist-field-label">
                  Name
                </label>
                <input
                  id="playlist-name"
                  aria-label="Playlist name"
                  placeholder={suggestedName}
                  ref={inputRef}
                  className="playlist-name-input"
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'playlist-error' : undefined}
                  maxLength={PLAYLIST_NAME_LIMIT}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                />
                {error && (
                  <p id="playlist-error" className="playlist-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="playlist-actions">
                  <button type="button" className="playlist-action" onClick={closeEditor}>
                    Cancel
                  </button>
                  <button type="submit" className="playlist-action playlist-submit">
                    {mode === 'rename' ? 'Save' : mode === 'duplicate' ? 'Duplicate' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </dialog>,
          document.body
        )}
    </div>
  );
}
