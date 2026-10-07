import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sanitizeChannelUrl } from '../src/utils/channelUrl.js';
import { YOUTUBE_ID_PATTERN } from '../src/utils/extractYouTubeId.js';

const SOURCE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const errors = [];

const dataDir = new URL('../src/data/', import.meta.url);
const files = readdirSync(fileURLToPath(dataDir))
  .filter((file) => file.endsWith('.json'))
  .sort();

if (files.length === 0) {
  errors.push('src/data: no channel pack JSON files found');
}

const seenIds = new Map();
let totalSources = 0;

for (const file of files) {
  let pack;
  try {
    pack = JSON.parse(readFileSync(new URL(file, dataDir), 'utf8'));
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
    continue;
  }
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    errors.push(`${file}: expected an object with name and sources`);
    continue;
  }
  if (typeof pack.name !== 'string' || pack.name.trim() === '') {
    errors.push(`${file}: missing name`);
  }
  if (!Array.isArray(pack.sources)) {
    errors.push(`${file}: expected a sources array`);
    continue;
  }
  pack.sources.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      errors.push(`${file}[${i}]: expected an object`);
      return;
    }
    if (typeof item.id !== 'string' || !SOURCE_ID_PATTERN.test(item.id)) {
      errors.push(`${file}[${i}]: invalid id "${item.id}"`);
    } else if (item.id.startsWith('custom-')) {
      errors.push(`${file}[${i}]: id "${item.id}" must not use the custom- prefix`);
    } else if (seenIds.has(item.id)) {
      errors.push(
        `${file}[${i}]: duplicate id "${item.id}" (already defined in ${seenIds.get(item.id)})`
      );
    } else {
      seenIds.set(item.id, file);
    }
    if (typeof item.label !== 'string' || item.label.trim() === '') {
      errors.push(`${file}[${i}]: missing label`);
    }
    const playback = item.playback;
    if (!sanitizeChannelUrl(item.channelUrl)) {
      errors.push(`${file}[${i}]: invalid or missing channelUrl`);
    }
    if (!playback || typeof playback !== 'object') {
      errors.push(`${file}[${i}]: missing playback`);
      return;
    }
    if (playback.provider !== 'youtube') {
      errors.push(`${file}[${i}]: unsupported provider "${playback.provider}"`);
    }
    if (playback.kind !== 'video') {
      errors.push(`${file}[${i}]: unsupported playback kind "${playback.kind}"`);
    } else if (typeof playback.videoId !== 'string' || !YOUTUBE_ID_PATTERN.test(playback.videoId)) {
      errors.push(`${file}[${i}]: invalid videoId "${playback.videoId}"`);
    }
  });
  totalSources += pack.sources.length;
}

if (errors.length > 0) {
  console.error('Stream data validation failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`Stream data OK: ${files.length} pack(s), ${totalSources} sources.`);
