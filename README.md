# SignTalker (MVP scaffold + Session lifecycle)

Web-based, no-login, temporary-session communication system for real-time sign ↔ speech assistance.

## Architecture (must-match)

- **Frontend**: React + TypeScript + Vite + Tailwind CSS  
- **Client-side AI only**: MediaPipe Hands + TensorFlow.js (gesture pipeline skeleton), Web Speech API (STT) + Speech Synthesis (TTS)
- **Backend**: Node.js + Express + Socket.io (signaling + realtime sync)
- **Session metadata only**: Redis (temporary; no permanent storage)
- **P2P media**: WebRTC between peers

## Monorepo layout

- `frontend/`: UI + WebRTC + speech + gesture pipeline skeleton (client-only processing)
- `backend/`: Express API + Socket.io signaling + Redis-backed temporary sessions
- `shared/`: shared TypeScript contracts (session/message/error/gesture)
- `docs/`: design/report docs
- `ml/`: offline-only dataset/model workflow (not runtime)
- `assets/demo/`: small offline-only demo assets (not runtime)

## Why this structure matches the report

- **Layered backend** (`api → controllers → services → repositories`) cleanly separates transport, orchestration, and persistence (Redis-only metadata).
- **Dedicated realtime modules** (`socket-signaling/`, `webrtc/`, `socket/`) map directly to “signaling vs P2P media” concerns in WebRTC systems.
- **Client-only AI modules** (`gesture/`, `speech/`) enforce the constraint that recognition runs in the browser and nothing is stored server-side.
- **Shared contracts** in `shared/` keep frontend/backend aligned without introducing extra databases or auth.

## Setup (terminal commands)

### Prereqs

- Install **Node.js 20+** (required to run scripts)
- Have a **Redis** instance available (local is fine)

### Install dependencies

```bash
cd SignTalker
npm install
```

### Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### WebRTC demo reliability (optional STUN/TURN)

For demos across real networks, configure `VITE_ICE_SERVERS` in `frontend/.env` (see `frontend/.env.example`).

Do **not** commit real TURN credentials.

## Browser requirements (demo-friendly)

- **Recommended**: Latest Chrome / Edge (best WebRTC + Web Speech API support).
- **Firefox**: WebRTC works; **SpeechRecognition (STT)** is typically unavailable.
- **Safari**: WebRTC support varies; STT support is limited.

## Graceful degradation behavior (MVP)

SignTalker is designed to stay usable even when one subsystem isn’t available:

- **Camera/microphone denied/unavailable**: Call page enters **text-only mode** (typed messages + transcript still work).
- **STT unsupported**: typed messaging remains available.
- **TTS unavailable**: sign-origin messages still appear in transcript, but won’t be spoken.
- **Gesture assets/model missing**: gesture pipeline shows an error banner and can be disabled; typed/STT still work.
- **No TURN configured**: WebRTC may fail across NATs; transcript/text still work over Socket.io.

## Transcript export (local-only)

The transcript can be downloaded as a `.txt` file **in the browser only**. It is **not uploaded** and is **not persisted** server-side.

### Run (two terminals)

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

## Use of ready-made datasets and preprocessed assets

- **Allowed (offline only)**: external datasets, preprocessed landmarks, demo clips for training/testing/benchmarking/local demos under `ml/` and `assets/demo/`.
- **Not allowed at runtime**: replacing live runtime processing with dataset playback, or sending raw media to the backend for recognition.
- **Runtime boundary**:
  - Gesture recognition uses **live MediaPipe Hands extraction in the browser** and **TensorFlow.js inference client-side**.
  - Speech uses **Web Speech API** (STT) and **browser speech synthesis** (TTS).
  - Backend never processes or stores raw audio/video/landmarks/transcripts; it only manages sessions, signaling, and temporary Redis metadata.

## Notes (MVP constraints)

- No registration/login; sessions are token-based and temporary.
- No permanent storage of media, gesture frames, or transcripts.
- Redis is used only for temporary session metadata.

## Local asset/model readiness (gesture pipeline)

For client-side gesture recognition in demos, you must provide local runtime assets:

- **MediaPipe Hands runtime files**: `frontend/public/mediapipe/hands/` (see `frontend/public/mediapipe/hands/README.md`)
- **TFJS gesture model export**: `frontend/public/models/gesture/` (see `frontend/public/models/gesture/README.md`)

# signtalker
