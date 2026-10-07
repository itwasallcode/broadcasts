import { useEffect, useState } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)
  );

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen.', error);
    }
  }

  return { isFullscreen, isFullscreenSupported, toggleFullscreen };
}
