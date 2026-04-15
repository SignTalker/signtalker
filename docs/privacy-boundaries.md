# Privacy boundaries (development vs demo vs production)

SignTalker is designed so that recognition happens **in the browser** and user media is **not stored**.

## What data may exist offline (development only)

The following may exist on developer machines for offline experimentation:

- External datasets (videos/images/labels) used for training/validation/benchmarking
- Locally generated processed artifacts (e.g., extracted hand landmarks, normalized sequences)
- Trained model artifacts and TensorFlow.js exports

These live under the root `ml/` directory and are not required for production runtime.

## What data is allowed in demo assets

The `assets/demo/` directory may contain small, curated files strictly for local demos and testing:

- Short audio/video demo clips (non-user, non-production)
- Example transcripts for demo playback and UI validation

Demo assets must:

- Be minimal (no heavy datasets)
- Be clearly non-user and non-production
- Not be uploaded/collected from real SignTalker sessions

## What is never stored in production

- Raw camera video from users
- Raw microphone audio from users
- Gesture frames / per-frame landmarks from live sessions
- Session transcripts (unless the user downloads locally in their own browser)

## What the backend never processes

The backend must **never**:

- Receive raw audio/video for recognition
- Run sign recognition or speech recognition
- Store media, landmarks, or transcripts

Backend scope is limited to:

- Token-based temporary sessions
- Socket.io signaling and realtime message synchronization
- Temporary Redis session metadata (ephemeral)

