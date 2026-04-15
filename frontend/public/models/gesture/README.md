# Gesture model (local)

Place a TensorFlow.js model export here for **local** development:

- `model.json`
- shard files (e.g. `group1-shard1ofN.bin`)
- optionally `labels.json` (JSON array of strings)

## Where these files must live

These files must be served by Vite as static assets, so they must exist under:

- `frontend/public/models/gesture/`

By default the frontend loads:

- `VITE_GESTURE_MODEL_URL=/models/gesture/model.json`
- optional `VITE_GESTURE_LABELS_URL=/models/gesture/labels.json`

So the default expected paths are:

- `frontend/public/models/gesture/model.json`
- `frontend/public/models/gesture/group*-shard*.bin` (or whatever your export produces)
- `frontend/public/models/gesture/labels.json` (optional)

This is used only in the **browser** (client-side inference). Nothing is uploaded to the backend.

