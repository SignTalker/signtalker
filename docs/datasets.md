# Datasets (offline-only)

This project may use **ready-made datasets** and **preprocessed assets** strictly for **offline** development workflows (training, testing, benchmarking, and local demos).

**Hard boundary**: raw user audio/video/gesture streams from SignTalker sessions are **never stored** and are **never used** as a dataset. Runtime recognition stays **client-side** (MediaPipe Hands + TensorFlow.js + Web Speech APIs).

## Dataset template (fill per dataset)

Use the following sections for each dataset we include in the offline workflow.

### Source dataset name

- Name:

### Source URL

- URL:

### License

- License:
- Notes / restrictions:

### Raw format

- Media type (e.g., video/image):
- Container/encoding (if applicable):
- Labels/annotations format:

### Processed format

- What we extract/store offline (e.g., landmarks, normalized sequences, metadata):
- File format (e.g., `.jsonl`, `.npy`, `.csv`):
- Directory layout:

### Intended use

- Training:
- Validation:
- Demo:
- Benchmark:

### Used at runtime?

- **Runtime use**: **No** (must remain **No** for external datasets)
- If “Yes” is ever considered, it must be for **non-user** demo assets only and must not replace live runtime processing.

## Compliance notes

- External datasets are **offline resources** only.
- SignTalker does **not** upload raw audio/video to the backend for recognition.
- Backend responsibilities remain limited to **session management**, **Socket.io signaling**, and **temporary Redis session metadata**.

