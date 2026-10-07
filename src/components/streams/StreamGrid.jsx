import { memo, useMemo } from 'react';

import { StreamCell } from '@/components/streams/StreamCell';

import { LAYOUTS } from '@/constants/layouts';

export const StreamGrid = memo(function StreamGrid({
  streams,
  layout,
  refreshKey = 0,
  inert = false,
}) {
  const { cols, rows, count } = LAYOUTS[layout] ?? LAYOUTS['3x3'];

  const visible = useMemo(
    () => Array.from({ length: count }, (_, i) => streams[i] ?? null),
    [streams, count]
  );

  const gridStyle = useMemo(() => ({ '--cols': cols, '--rows': rows }), [cols, rows]);

  return (
    <div className="stream-grid" style={gridStyle} inert={inert}>
      {visible.map((stream, i) => (
        <StreamCell
          key={stream?.id ?? `empty:${i}`}
          stream={stream}
          index={i}
          refreshKey={refreshKey}
        />
      ))}
    </div>
  );
});
