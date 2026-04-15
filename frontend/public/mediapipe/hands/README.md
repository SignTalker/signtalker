# MediaPipe Hands assets (local)

SignTalker loads MediaPipe Hands assets from this folder at runtime:

- `hands_solution_packed_assets.data`
- `hands_solution_packed_assets.loader.js`
- `hands_solution_simd_wasm_bin.wasm` (and/or non-simd wasm depending on package version)

## Where these files must live

These files must be served by Vite as static assets, so they must exist under:

- `frontend/public/mediapipe/hands/`

At runtime, the app will request them via URLs like:

- `/mediapipe/hands/<filename>`

## How to obtain them (local-only)

After dependencies are installed, copy them from your installed package:

- From: `node_modules/@mediapipe/hands/`
- To: `frontend/public/mediapipe/hands/`

If you are unsure what to copy, search inside `node_modules/@mediapipe/hands/` for:

- `hands_solution_packed_assets.*`
- `hands_solution*_wasm*.wasm`
- `hands_solution*_wasm*.js` (if present in your package version)

This keeps runtime processing fully **client-side** and avoids hardcoding cloud/CDN URLs.

