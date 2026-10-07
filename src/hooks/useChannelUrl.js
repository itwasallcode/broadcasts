import { useEffect, useState } from 'react';

import { sanitizeChannelUrl } from '@/utils/channelUrl';

const channelUrls = new Map();

export function useChannelUrl(stream) {
  const videoId = stream?.playback?.videoId;
  const channelUrl = sanitizeChannelUrl(stream?.channelUrl);
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (channelUrl || !videoId || channelUrls.has(videoId)) return;
    const controller = new window.AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;

    async function resolveChannel() {
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await window.fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const metadata = await response.json();
        const url = sanitizeChannelUrl(metadata.author_url);
        if (!active || !url) return;
        channelUrls.set(videoId, url);
        setResolved({ videoId, url });
      } catch {
        // Keep playback available when channel metadata cannot be loaded.
      } finally {
        window.clearTimeout(timeout);
      }
    }

    resolveChannel();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [channelUrl, videoId]);

  return (
    channelUrl || channelUrls.get(videoId) || (resolved?.videoId === videoId ? resolved?.url : null)
  );
}
