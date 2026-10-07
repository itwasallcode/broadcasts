---
name: update-broadcast-ids
description: Fix a broken default broadcast id when a default YouTube stream is unavailable and a replacement video id or URL is provided or needs to be found.
---

Use `docs/guides/Update-Broadcast-IDs.md` as the source for updating the channel list JSON under `src/data/` and running `npm run build`.

Agent additions on top of the guide:

1. Before updating the video id, create and switch to the `fix/update-broken-video-id` branch.
2. Accept a bare 11-character id or a full YouTube URL without asking for the other form.
3. Extract ids from `watch?v=`, `live/`, `youtu.be/` or `embed/` links with `extractYouTubeId` in `src/utils/extractYouTubeId.js`, and use `YOUTUBE_ID_PATTERN` in the same file for the id format.
4. Before editing, verify that the new video is live on the intended channel using evidence beyond oEmbed, or report that live status could not be verified and stop.
5. After the build passes, show the diff and a commit subject in the guide's format, then stop.
6. Never commit, push or open a pull request unless asked.
