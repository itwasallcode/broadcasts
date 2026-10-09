import { memo, useMemo } from 'react';

import { StreamCell } from '@/components/streams/StreamCell';

import { LAYOUTS } from '@/constants/layouts';

// Keep players mounted during reordering only when keyboard order can follow the grid.
const preservePlayerOrder = globalThis.CSS?.supports('reading-flow', 'grid-order') ?? false;

export const StreamGrid = memo(function StreamGrid({
  streams,
  layout,
  refreshKey = 0,
  inert = false,
}) {
  const { cols, rows, count } = LAYOUTS[layout] ?? LAYOUTS['3x3'];

  const visible = useMemo(() => {
    const cells = Array.from({ length: count }, (_, index) => ({
      stream: streams[index] ?? null,
      index,
      key: streams[index]?.id ?? `empty:${index}`,
    }));
    return preservePlayerOrder ? cells.sort((a, b) => a.key.localeCompare(b.key)) : cells;
  }, [streams, count]);

  const gridStyle = useMemo(() => ({ '--cols': cols, '--rows': rows }), [cols, rows]);

  return (
    <div className="stream-grid" style={gridStyle} inert={inert}>
      {visible.map(({ stream, index, key }) => (
        <StreamCell
          key={stream ? `${key}:${stream.playback.videoId}` : key}
          stream={stream}
          index={index}
          refreshKey={refreshKey}
        />
      ))}
    </div>
  );
});
