# Update Broadcast IDs

Video ids change when a broadcast restarts, so the defaults in the repo go stale.

Change only the default channel's `playback.videoId` to preserve its permanent `id` and the user's saved channel order and visibility.

## File

- **Channel list** (the channel list JSON under `src/data/`) — the only file to edit.

## Example

Channel A's broadcast died, so replace its old video id `a1b2c3d4e5f` with `f5e4d3c2b1a`:

1. Take the new 11-character id from a YouTube `watch?v=`, `live/`, `youtu.be/` or `embed/` link (only YouTube is supported).
2. In the channel list, set `playback.videoId` for that channel's entry under `sources`:
   ```json
   {
     "id": "channel-a",
     "label": "Channel A",
     "playback": { "provider": "youtube", "kind": "video", "videoId": "f5e4d3c2b1a" }
   }
   ```

Run `npm run build`, then open a pull request to `master`.

You can use a title like this — backticks make the ids stand out in the commit history:

```text
fix: update video id from `a1b2c3d4e5f` to `f5e4d3c2b1a`
```

Naming both ids keeps the subject unique and shows which broadcast died, so the channel name is not needed.
