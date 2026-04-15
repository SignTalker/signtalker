export function getBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:8080";
}

export function getGestureModelUrl(): string {
  return (import.meta.env.VITE_GESTURE_MODEL_URL as string | undefined) ?? "/models/gesture/model.json";
}

export function getGestureLabelsUrl(): string | null {
  return (import.meta.env.VITE_GESTURE_LABELS_URL as string | undefined) ?? null;
}

export function getGestureConfidenceThreshold(): number {
  const raw = import.meta.env.VITE_GESTURE_CONFIDENCE_THRESHOLD as string | undefined;
  const n = raw ? Number(raw) : 0.85;
  return Number.isFinite(n) ? n : 0.85;
}

/**
 * MediaPipe Hands assets base path.
 * For local-only usage you can copy assets from node_modules into `frontend/public/mediapipe/hands/`.
 */
export function getMediaPipeHandsBasePath(): string {
  return (import.meta.env.VITE_MEDIAPIPE_HANDS_BASE_PATH as string | undefined) ?? "/mediapipe/hands/";
}

export function getIceServers(): RTCIceServer[] | undefined {
  const raw = (import.meta.env as unknown as Record<string, string | undefined>)["VITE_ICE_SERVERS"];
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed as RTCIceServer[];
  } catch {
    return undefined;
  }
}

