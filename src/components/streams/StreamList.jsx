import { memo, useCallback, useState } from 'react';

import { EditStreamDialog } from '@/components/layout/EditStreamDialog';
import { DragHandle } from '@/components/ui/DragHandle';

import { useStreamDrag } from '@/hooks/useStreamDrag';

import { CUSTOM_ID_PREFIX } from '@/utils/workspace';

export const StreamList = memo(function StreamList({
  streams,
  playlists,
  onEditStream,
  onReorderStreams,
  onRemoveStream,
}) {
  const [editing, setEditing] = useState(null);
  const { overIndex, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel } =
    useStreamDrag(streams, onReorderStreams);

  const handleRemove = useCallback(
    (e, id) => {
      e.stopPropagation();
      onRemoveStream(id);
    },
    [onRemoveStream]
  );

  return (
    <>
      <ul className="stream-list">
        {streams.map((stream, i) => (
          <li
            key={stream.id}
            className={`stream-item ${overIndex === i ? 'drag-over' : ''}`}
            data-stream-index={i}
          >
            <span
              className="stream-item-handle"
              onPointerDown={(e) => handleDragStart(e, i)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragCancel}
            >
              <DragHandle />
            </span>
            <span className="stream-item-index">{i + 1}</span>
            {stream.id.startsWith(CUSTOM_ID_PREFIX) && onEditStream ? (
              <button
                type="button"
                className="stream-item-edit"
                title="Edit stream"
                aria-label={`Edit ${stream.label || stream.id}`}
                onClick={(event) => setEditing({ stream, trigger: event.currentTarget })}
              >
                <span className="stream-item-name">{stream.label || stream.id}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="m16 3 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z" />
                </svg>
              </button>
            ) : (
              <span className="stream-item-name">{stream.label || stream.id}</span>
            )}

            {onRemoveStream && (
              <button
                className="stream-item-remove"
                onClick={(e) => handleRemove(e, stream.id)}
                title="Remove stream"
                aria-label={`Remove ${stream.label || stream.id}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <EditStreamDialog
          stream={editing.stream}
          streams={streams}
          shared={
            playlists.filter((playlist) =>
              playlist.sources.some((source) => source.id === editing.stream.id)
            ).length > 1
          }
          returnFocusTarget={editing.trigger}
          onSave={onEditStream}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
});
