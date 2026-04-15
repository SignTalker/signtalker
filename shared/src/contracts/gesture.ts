export type GestureLabel = string;

export type GestureResult = {
  label: GestureLabel;
  confidence: number; // 0..1
  recognizedAt: string; // ISO timestamp
};

