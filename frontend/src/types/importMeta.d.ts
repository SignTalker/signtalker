interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_GESTURE_MODEL_URL?: string;
  readonly VITE_GESTURE_LABELS_URL?: string;
  readonly VITE_GESTURE_CONFIDENCE_THRESHOLD?: string;
  readonly VITE_MEDIAPIPE_HANDS_BASE_PATH?: string;
  readonly VITE_ICE_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

