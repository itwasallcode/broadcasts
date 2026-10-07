import { useCallback, useRef, useState } from 'react';

import { Menu } from '@/components/layout/Menu';
import { Sidebar } from '@/components/layout/Sidebar';
import { StreamGrid } from '@/components/streams/StreamGrid';

import { useWorkspace } from '@/hooks/useWorkspace';

export default function App() {
  const {
    layout,
    onLayoutChange,
    streams,
    onReorderStreams,
    onAddStream,
    onRemoveStream,
    onResetStreams,
  } = useWorkspace();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const menuButtonRef = useRef(null);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((open) => !open);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      <StreamGrid streams={streams} layout={layout} refreshKey={refreshKey} inert={isMenuOpen} />
      <Sidebar
        isMenuOpen={isMenuOpen}
        onMenuToggle={toggleMenu}
        onRefresh={handleRefresh}
        menuButtonRef={menuButtonRef}
      />
      <Menu
        layout={layout}
        onLayoutChange={onLayoutChange}
        streams={streams}
        onReorderStreams={onReorderStreams}
        onAddStream={onAddStream}
        onRemoveStream={onRemoveStream}
        onResetStreams={onResetStreams}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        returnFocusRef={menuButtonRef}
      />
    </div>
  );
}
