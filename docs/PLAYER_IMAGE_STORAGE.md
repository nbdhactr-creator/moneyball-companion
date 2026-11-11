# Player image storage design

## Facepacks remain user-owned local assets

A facepack can be many gigabytes. Moneyball Companion must not require users to upload a full facepack to GitHub, Supabase or another hosted service.

The preferred desktop workflow is to let the user select the existing facepack directory through the browser's File System Access API where supported. The app stores a directory handle and a compact UID-to-relative-file index, not duplicate image binaries. The user can rescan the folder after changing or replacing the pack. Permission may need to be renewed by the browser.

## Storage boundaries

- Original facepack: remains in its current folder or on an external drive.
- Local index: IndexedDB, containing UID, relative path, filename, size, modification metadata and match status.
- Manual overrides: local database records keyed by stable FM player UID.
- Optional cloud sync: sync metadata and user-created mappings by default, not the original facepack.
- Optional cross-device portraits: a future opt-in feature for selected resized images only, subject to image rights and storage limits.

## Import and matching

- Scan folders incrementally and yield between batches.
- Perform directory traversal and indexing in a Web Worker where browser APIs permit.
- Match only verified UID filename patterns automatically.
- Keep ambiguous or unmatched images in a review queue.
- Never match on player name alone without explicit confirmation.
- Show scan progress, matched count, unmatched count, duplicate UID conflicts and errors.
- Rescanning must update changed files without rebuilding the entire index when possible.
- Missing folder permission or disconnected drives must not affect player data or scouting.

## Compatibility and fallback

The File System Access API is not uniformly supported across browsers. Provide a fallback based on selecting a folder/files through standard file inputs where available, with a clear explanation that persistent access may not be available. The core application must remain usable without portraits.

## Performance and safety

- Never load every image into memory at once.
- Read image files only when needed; lazy-load portraits in tables and profiles.
- Cache small generated thumbnails selectively, with storage quota checks and an explicit cache-clear action.
- Keep image binaries out of player/season JSON exports.
- Do not place facepack binaries in the public Git repository.
- Treat browser storage as recoverable application data, not the only copy of the original facepack.
