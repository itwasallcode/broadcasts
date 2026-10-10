---
name: update-video-ids
description: Update the video ID of an unavailable default YouTube stream when a replacement video ID or URL is provided or needs to be found.
---

Follow `docs/guides/Update-Video-IDs.md` to update the default stream data, build the app and check playback.

Agent additions on top of the guide:

1. Before editing, create and switch to `fix/update-broken-video-id` from the latest default branch.
2. Accept a bare 11-character ID or a full YouTube URL without asking for the other form.
3. Use `extractYouTubeId` in `src/utils/extractYouTubeId.js` to parse the input and `YOUTUBE_ID_PATTERN` in the same file to validate the ID.
4. Before editing, verify that the new video is live on the intended channel using evidence beyond oEmbed, or report that live status could not be verified and stop.
5. After the build passes, show the diff, playback verification results and a commit subject in the guide's format, then stop.
6. Never commit, push or open a pull request unless asked.
