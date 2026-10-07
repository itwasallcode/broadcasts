import { YOUTUBE_ID_PATTERN } from '@/utils/extractYouTubeId';

const EMBED_PARAMS = 'autoplay=1&mute=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1';

export function buildEmbedUrl(playback) {
  if (!playback || playback.provider !== 'youtube') return null;
  if (playback.kind === 'video') {
    return `https://www.youtube.com/embed/${playback.videoId}?${EMBED_PARAMS}`;
  }
  return null;
}

export function sanitizePlayback(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.provider !== 'youtube' || value.kind !== 'video') return null;
  if (typeof value.videoId !== 'string' || !YOUTUBE_ID_PATTERN.test(value.videoId)) return null;
  return { provider: 'youtube', kind: 'video', videoId: value.videoId };
}
