import { useCallback, useRef, useState } from 'react';

function indexFromPoint(x, y) {
  const item = document.elementFromPoint(x, y)?.closest('[data-stream-index]');
  return item ? Number(item.dataset.streamIndex) : null;
}

export function useStreamDrag(streams, onReorderStreams) {
  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleDragStart = useCallback((e, i) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.isTrusted) e.currentTarget.setPointerCapture(e.pointerId);
    dragIndex.current = i;
    setOverIndex(i);
  }, []);

  const handleDragMove = useCallback((e) => {
    if (dragIndex.current === null) return;
    setOverIndex(indexFromPoint(e.clientX, e.clientY));
  }, []);

  const handleDragEnd = useCallback(
    (e) => {
      const from = dragIndex.current;
      if (from === null) return;
      dragIndex.current = null;
      setOverIndex(null);
      const to = indexFromPoint(e.clientX, e.clientY);
      if (to === null || to === from) return;
      const next = [...streams];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onReorderStreams(next);
    },
    [streams, onReorderStreams]
  );

  const handleDragCancel = useCallback(() => {
    dragIndex.current = null;
    setOverIndex(null);
  }, []);

  return {
    overIndex,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
