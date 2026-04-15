# Model pipeline (offline training → client-side inference)

This document defines the intended gesture model workflow while preserving the core architecture constraint:

- **All runtime gesture processing remains client-side** in the browser.
- **No raw audio/video is sent to the backend** for recognition.

## Offline pipeline (ML/data workflow)

### 1) Raw gesture videos/images (offline)

- Input sources:
  - Curated external datasets (offline only)
  - Locally recorded demo clips for development/testing (offline only)
- Stored under: `ml/raw/` (never used by production runtime)

### 2) MediaPipe Hands landmark extraction (offline)

- Run MediaPipe Hands over raw clips to extract hand landmarks per frame.
- Output: per-frame landmark sequences + labels.
- Stored under: `ml/processed/`

### 3) Normalization (offline)

Typical steps (exact details TBD in later phases):

- Coordinate normalization (e.g., translation/scale to a stable reference)
- Temporal normalization (padding/resampling)
- Optional smoothing/outlier handling

Outputs stay in `ml/processed/`.

### 4) TensorFlow model training (offline)

- Train a model on normalized landmark sequences.
- Evaluate on validation/benchmark splits.
- Store training artifacts/checkpoints under `ml/models/` (offline artifacts only).

### 5) Export to TensorFlow.js (offline)

- Export the trained model to TensorFlow.js format suitable for browser inference.
- Place export outputs under `ml/models/` and (when integrated later) copy the runtime-ready model into the frontend’s static assets.

## Runtime pipeline (in the browser)

At runtime, SignTalker uses **live** camera frames:

- Camera → **MediaPipe Hands** (live landmark extraction in `frontend/`)
- Landmarks → **TensorFlow.js** (client-side inference)
- Inference result → UI + optional TTS (browser speech synthesis)

## Preprocessed landmarks for training acceleration

If a dataset provides precomputed landmarks or if we generate landmark files offline, they may be used to:

- Speed up training/experimentation
- Enable reproducible benchmarks

**But** runtime remains unchanged: it still uses **live MediaPipe extraction** and never substitutes external datasets for real-time processing.

