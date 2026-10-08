import { useCallback, useEffect, useRef } from 'react';

import { AppUpdate } from '@/components/layout/AppUpdate';
import { LayoutButtons } from '@/components/layout/LayoutButtons';
import { PlaylistPicker } from '@/components/layout/PlaylistPicker';
import { StreamList } from '@/components/streams/StreamList';

import { MOBILE_RECOMMENDED_LAYOUTS, STANDARD_LAYOUTS } from '@/constants/layouts';

export function Menu({
  playlists,
  activePlaylistId,
  onPlaylistChange,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  layout,
  onLayoutChange,
  streams,
  onReorderStreams,
  onAddStream,
  onAddSources,
  onRemoveStream,
  onResetStreams,
  isOpen,
  onClose,
  returnFocusRef,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const returnFocusTarget = returnFocusRef.current;
    const getControls = () =>
      panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
    (getControls()[0] ?? panel).focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const controls = getControls();
        const first = controls[0] ?? panel;
        const last = controls[controls.length - 1] ?? panel;
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    panel.addEventListener('keydown', handleKeyDown);
    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
      returnFocusTarget?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  const handleLayoutSelect = useCallback(
    (e) => {
      const value = e.currentTarget.dataset.value;
      if (value) {
        onLayoutChange(value);
        onClose();
      }
    },
    [onLayoutChange, onClose]
  );

  const handleReset = useCallback(() => {
    if (window.confirm('Reset streams in this playlist to defaults?')) {
      onResetStreams();
    }
  }, [onResetStreams]);

  return (
    <>
      <div
        ref={panelRef}
        id="stream-menu"
        className={`menu-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Stream settings"
        aria-modal={isOpen ? true : undefined}
        tabIndex={-1}
        inert={!isOpen}
      >
        <section className="menu-section">
          <p className="menu-label">GRID</p>
          <LayoutButtons options={STANDARD_LAYOUTS} layout={layout} onSelect={handleLayoutSelect} />
          <div className="layout-subgroup">
            <p className="layout-subgroup-label">RECOMMENDED FOR MOBILE</p>
            <LayoutButtons
              options={MOBILE_RECOMMENDED_LAYOUTS}
              layout={layout}
              onSelect={handleLayoutSelect}
            />
          </div>
        </section>

        <section className="menu-section">
          <p className="menu-label">STREAMS</p>
          <PlaylistPicker
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onSelect={onPlaylistChange}
            onCreate={onCreatePlaylist}
            onRename={onRenamePlaylist}
            onDelete={onDeletePlaylist}
            onReset={handleReset}
            streams={streams}
            onAddStream={onAddStream}
            onAddSources={onAddSources}
          />

          <StreamList
            streams={streams}
            onReorderStreams={onReorderStreams}
            onRemoveStream={onRemoveStream}
          />
        </section>

        <AppUpdate />
      </div>

      {isOpen && <div className="menu-backdrop" onClick={onClose} />}
    </>
  );
}
