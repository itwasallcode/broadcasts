import { CollapseIcon } from '@/components/ui/CollapseIcon';
import { ExpandIcon } from '@/components/ui/ExpandIcon';
import { MenuIcon } from '@/components/ui/MenuIcon';
import { RefreshIcon } from '@/components/ui/RefreshIcon';

import { useFullscreen } from '@/hooks/useFullscreen';
import { useMediaQuery } from '@/hooks/useMediaQuery';

import { FINE_POINTER_HOVER } from '@/constants/media';

export function Sidebar({ isMenuOpen, onMenuToggle, onRefresh, menuButtonRef }) {
  const { isFullscreen, isFullscreenSupported, toggleFullscreen } = useFullscreen();
  const hasFinePointerHover = useMediaQuery(FINE_POINTER_HOVER);
  const showFullscreen = isFullscreenSupported && hasFinePointerHover;

  return (
    <div className={`side-buttons ${isMenuOpen ? 'hidden' : ''}`} inert={isMenuOpen}>
      <button
        ref={menuButtonRef}
        className={`side-btn ${isMenuOpen ? 'active' : ''}`}
        onClick={onMenuToggle}
        title="Menu"
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
        aria-controls="stream-menu"
        aria-haspopup="dialog"
      >
        <MenuIcon open={isMenuOpen} />
      </button>

      <button
        className="side-btn"
        onClick={onRefresh}
        title="Refresh all streams"
        aria-label="Refresh all streams"
      >
        <RefreshIcon />
      </button>

      {showFullscreen && (
        <button
          className={`side-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
        </button>
      )}
    </div>
  );
}
