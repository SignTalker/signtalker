export function getBackendUrl() {
    return import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";
}
export function getGestureModelUrl() {
    return import.meta.env.VITE_GESTURE_MODEL_URL ?? "/models/gesture/model.json";
}
export function getGestureLabelsUrl() {
    return import.meta.env.VITE_GESTURE_LABELS_URL ?? null;
}
export function getGestureConfidenceThreshold() {
    const raw = import.meta.env.VITE_GESTURE_CONFIDENCE_THRESHOLD;
    const n = raw ? Number(raw) : 0.85;
    return Number.isFinite(n) ? n : 0.85;
}
/**
 * MediaPipe Hands assets base path.
 * For local-only usage you can copy assets from node_modules into `frontend/public/mediapipe/hands/`.
 */
export function getMediaPipeHandsBasePath() {
    return import.meta.env.VITE_MEDIAPIPE_HANDS_BASE_PATH ?? "/mediapipe/hands/";
}
export function getIceServers() {
    const raw = import.meta.env["VITE_ICE_SERVERS"];
    if (!raw)
        return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return undefined;
        return parsed;
    }
    catch {
        return undefined;
    }
}
