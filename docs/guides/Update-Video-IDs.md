# Update Video IDs

Video IDs can change when a stream restarts, so the defaults in the repo can stop working.

Change only the default stream's `playback.videoId` and keep its permanent `id` to preserve the user's saved stream order and visibility.

## File

Edit only [`src/data/turkish-streams.json`](../../src/data/turkish-streams.json), which contains the default streams.

## Update

1. Take the new 11-character ID from a YouTube `watch?v=`, `live/`, `youtu.be/` or `embed/` link (only YouTube is supported).
2. Verify that the replacement is live on the intended YouTube channel.
3. In that stream's existing entry under `sources`, change only `playback.videoId`:
   ```diff
   - "videoId": "a1b2c3d4e5f"
   + "videoId": "f5e4d3c2b1a"
   ```

Validate the data and build the app:

```bash
npm run build
```

The build checks the data format, not whether a video is live or playable.

Open the production preview and confirm that the updated stream plays:

```bash
npm run preview
```

Open a pull request to `master` after checking playback.

Include the old and new video IDs in the commit message:

```text
fix: update video id from `a1b2c3d4e5f` to `f5e4d3c2b1a`
```
