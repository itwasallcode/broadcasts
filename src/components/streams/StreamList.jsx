import { memo, useCallback } from 'react';

import { DragHandle } from '@/components/ui/DragHandle';

import { useStreamDrag } from '@/hooks/useStreamDrag';

export const StreamList = memo(function StreamList({ streams, onReorderStreams, onRemoveStream }) {
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
          <span className="stream-item-name">{stream.label || stream.id}</span>

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
  );
});
