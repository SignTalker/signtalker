import type { GestureResult } from "@signtalker/shared";
import { Hands, type NormalizedLandmarkList, type Results } from "@mediapipe/hands";
import * as tf from "@tensorflow/tfjs";
import { getGestureConfidenceThreshold, getGestureLabelsUrl, getGestureModelUrl, getMediaPipeHandsBasePath } from "../utils/env";

/**
 * MediaPipe Hands + TensorFlow.js gesture pipeline.
 *
 * Privacy boundary:
 * - Frames and landmarks never leave the browser.
 * - Backend is not used for recognition.
 */
export class GesturePipelineManager {
  private hands: Hands | null = null;
  private model: tf.GraphModel | tf.LayersModel | null = null;
  private labels: string[] | null = null;
  private latestLandmarks: NormalizedLandmarkList | null = null;
  private resultsHandlerRegistered = false;

  private running = false;
  private rafId: number | null = null;
  private startSeq = 0;
  private tickInFlight = false;

  private lastResult: GestureResult | null = null;
  private lastEmittedLabel: string | null = null;
  private lastEmitAtMs = 0;
  private lowConfidenceSinceMs: number | null = null;
  private handMissingSinceMs: number | null = null;
  private candidateLabel: string | null = null;
  private candidateSinceMs: number | null = null;
  private lastStateKind: GesturePipelineState["kind"] | null = null;

  constructor(
    private readonly opts: {
      onState?: (s: GesturePipelineState) => void;
      onPrediction?: (r: GestureResult) => void;
    } = {}
  ) {}

  isSupported(): boolean {
    return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }

  getLatestResult(): GestureResult | null {
    return this.lastResult;
  }

  private emitState(s: GesturePipelineState) {
    // Avoid spamming identical state kinds every animation frame.
    if (this.lastStateKind === s.kind) return;
    this.lastStateKind = s.kind;
    this.opts.onState?.(s);
  }

  async startPipeline(videoEl: HTMLVideoElement): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.startSeq += 1;
    const seq = this.startSeq;
    this.lastStateKind = null;
    this.emitState({ kind: "starting" });

    try {
      await this.ensureModelLoaded();
    } catch (e) {
      this.running = false;
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || String(err);
      // Distinguish missing model vs generic load failure where possible.
      if (msg.includes("MISSING_MODEL")) {
        this.emitState({ kind: "runtime-missing", component: "model", message: msg });
      } else if (msg.includes("MISSING_LABELS")) {
        this.emitState({ kind: "runtime-missing", component: "labels", message: msg });
      } else {
        this.emitState({ kind: "model-load-failed", message: msg });
      }
      return;
    }

    try {
      await this.ensureHandsInitialized();
    } catch (e) {
      this.running = false;
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || String(err);
      if (msg.includes("MISSING_MEDIAPIPE_ASSETS")) {
        this.emitState({ kind: "runtime-missing", component: "mediapipe-assets", message: msg });
      } else {
        this.emitState({ kind: "model-load-failed", message: `MediaPipe init failed: ${msg}` });
      }
      return;
    }

    // If stop was requested during async startup, do not enter loop.
    if (!this.running || seq !== this.startSeq) return;

    this.emitState({
      kind: "running",
      modelLoaded: true,
      labelsLoaded: this.labels != null,
      cameraActive: true
    });
    this.loop(videoEl, seq);
  }

  async stopPipeline(): Promise<void> {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.tickInFlight = false;
    this.lowConfidenceSinceMs = null;
    this.handMissingSinceMs = null;
    this.lastEmittedLabel = null;
    this.lastEmitAtMs = 0;
    this.latestLandmarks = null;
    this.candidateLabel = null;
    this.candidateSinceMs = null;
    this.lastStateKind = null;
    this.opts.onState?.({ kind: "stopped" });
  }

  /**
   * Extract MediaPipe landmarks from the current video frame.
   * Returns the first detected hand (21 landmarks) or null.
   */
  async extractLandmarks(videoEl: HTMLVideoElement): Promise<NormalizedLandmarkList | null> {
    if (!this.hands) throw new Error("Hands not initialized");
    await this.hands.send({ image: videoEl });
    return this.latestLandmarks;
  }

  /**
   * Normalize landmarks into a flat Float32Array suitable for a simple TF model.
   *
   * Current assumption (documented): input is [x,y,z] for 21 points → 63 floats.
   * Normalization: translate so wrist (index 0) is origin and scale by max distance.
   */
  normalizeLandmarks(lm: NormalizedLandmarkList): Float32Array {
    const wrist = lm[0];
    let maxDist = 0.00001;
    for (const p of lm) {
      const dx = p.x - wrist.x;
      const dy = p.y - wrist.y;
      const dz = (p.z ?? 0) - (wrist.z ?? 0);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > maxDist) maxDist = d;
    }

    const out = new Float32Array(21 * 3);
    for (let i = 0; i < 21; i++) {
      const p = lm[i];
      out[i * 3 + 0] = (p.x - wrist.x) / maxDist;
      out[i * 3 + 1] = (p.y - wrist.y) / maxDist;
      out[i * 3 + 2] = ((p.z ?? 0) - (wrist.z ?? 0)) / maxDist;
    }
    return out;
  }

  async classifyGesture(input: Float32Array): Promise<{ label: string; confidence: number } | null> {
    if (!this.model) throw new Error("Model not loaded");

    const x = tf.tensor(input, [1, input.length], "float32");
    let y: tf.Tensor | null = null;
    try {
      // Support both graph and layers models
      if ("executeAsync" in this.model) {
        const res = await (this.model as tf.GraphModel).executeAsync(x);
        y = Array.isArray(res) ? (res[0] as tf.Tensor) : (res as tf.Tensor);
      } else {
        y = (this.model as tf.LayersModel).predict(x) as tf.Tensor;
      }

      const probs = (await y.data()) as unknown as Float32Array;
      let bestIdx = 0;
      let best = -Infinity;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > best) {
          best = probs[i];
          bestIdx = i;
        }
      }

      const label = this.labels?.[bestIdx] ?? `class_${bestIdx}`;
      return { label, confidence: best };
    } finally {
      x.dispose();
      try {
        y?.dispose();
      } catch {
        // ignore
      }
    }
  }

  handleLowConfidencePrediction(nowMs: number) {
    const threshold = getGestureConfidenceThreshold();
    if (this.lowConfidenceSinceMs == null) this.lowConfidenceSinceMs = nowMs;
    if (nowMs - this.lowConfidenceSinceMs > 900) {
      this.emitState({ kind: "sign-unclear", threshold });
    }
  }

  private async ensureModelLoaded() {
    if (this.model) return;
    this.emitState({ kind: "model-loading" });

    const modelUrl = getGestureModelUrl();
    // Preflight the model.json to provide a clearer error when static assets are missing.
    await this.preflightUrl(modelUrl, "MISSING_MODEL");
    // Prefer graph model; fall back to layers model if needed.
    try {
      this.model = await tf.loadGraphModel(modelUrl);
    } catch {
      this.model = await tf.loadLayersModel(modelUrl);
    }

    const labelsUrl = getGestureLabelsUrl();
    if (labelsUrl) {
      // Labels are optional, but if configured and missing, surface a distinct warning state.
      try {
        await this.preflightUrl(labelsUrl, "MISSING_LABELS");
        const res = await fetch(labelsUrl);
        const data = (await res.json()) as unknown;
        if (Array.isArray(data) && data.every((x) => typeof x === "string")) this.labels = data as string[];
      } catch (e) {
        this.labels = null;
        const err = e instanceof Error ? e.message : String(e);
        this.emitState({ kind: "runtime-missing", component: "labels", message: err });
      }
    }
  }

  private async ensureHandsInitialized() {
    if (this.hands) return;
    const base = getMediaPipeHandsBasePath();
    // Best-effort preflight for the most common local asset filename.
    // If your package version differs, MediaPipe initialization may still fail later.
    try {
      await this.preflightUrl(`${base}hands_solution_packed_assets.loader.js`, "MISSING_MEDIAPIPE_ASSETS");
    } catch (e) {
      // Non-fatal: still try to initialize Hands (file names differ across some builds).
      const err = e instanceof Error ? e.message : String(e);
      this.emitState({ kind: "runtime-missing", component: "mediapipe-assets", message: err });
    }

    this.hands = new Hands({
      locateFile: (file) => `${base}${file}`
    });

    if (!this.resultsHandlerRegistered) {
      this.hands.onResults((r: Results) => {
        this.latestLandmarks = r.multiHandLandmarks?.[0] ?? null;
      });
      this.resultsHandlerRegistered = true;
    }

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  private loop(videoEl: HTMLVideoElement, seq: number) {
    const tick = async () => {
      if (!this.running || seq !== this.startSeq) return;
      if (this.tickInFlight) {
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }
      this.tickInFlight = true;

      const now = Date.now();

      let lm: NormalizedLandmarkList | null = null;
      try {
        lm = await this.extractLandmarks(videoEl);
      } catch {
        // If extraction fails, keep running but surface a subtle state.
        this.emitState({ kind: "hand-not-detected" });
      }

      if (!lm) {
        if (this.handMissingSinceMs == null) this.handMissingSinceMs = now;
        if (now - this.handMissingSinceMs > 500) this.emitState({ kind: "hand-not-detected" });
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }

      this.handMissingSinceMs = null;
      const input = this.normalizeLandmarks(lm);
      let pred: { label: string; confidence: number } | null = null;
      try {
        pred = await this.classifyGesture(input);
      } catch (e) {
        // Inference failures should not crash the call page; keep running but surface a stable error.
        const msg = e instanceof Error ? e.message : String(e);
        this.emitState({ kind: "inference-failed", message: msg });
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }
      if (!pred) {
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }

      const threshold = getGestureConfidenceThreshold();
      if (pred.confidence < threshold) {
        this.handleLowConfidencePrediction(now);
        // Reset stability candidate when confidence is too low.
        this.candidateLabel = null;
        this.candidateSinceMs = null;
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }

      // Confidence good: clear “unclear” timers.
      this.lowConfidenceSinceMs = null;

      // Stability gate: require the same label to be seen for a short window.
      const stableMs = 250;
      if (this.candidateLabel !== pred.label) {
        this.candidateLabel = pred.label;
        this.candidateSinceMs = now;
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }
      if (this.candidateSinceMs != null && now - this.candidateSinceMs < stableMs) {
        this.tickInFlight = false;
        this.rafId = requestAnimationFrame(() => void tick());
        return;
      }

      // De-dupe: only emit on label change or after cooldown.
      const cooldownMs = 900;
      const canEmit =
        pred.label !== this.lastEmittedLabel || now - this.lastEmitAtMs > cooldownMs;

      if (canEmit) {
        this.lastEmittedLabel = pred.label;
        this.lastEmitAtMs = now;

        const result: GestureResult = {
          label: pred.label,
          confidence: pred.confidence,
          recognizedAt: new Date(now).toISOString()
        };

        this.lastResult = result;
        this.opts.onPrediction?.(result);
        this.emitState({
          kind: "running",
          modelLoaded: true,
          labelsLoaded: this.labels != null,
          cameraActive: true
        });
      }

      this.tickInFlight = false;
      this.rafId = requestAnimationFrame(() => void tick());
    };

    this.rafId = requestAnimationFrame(() => void tick());
  }

  private async preflightUrl(url: string, code: "MISSING_MODEL" | "MISSING_LABELS" | "MISSING_MEDIAPIPE_ASSETS") {
    // Best-effort: give a clearer error when static files are missing.
    // If the server blocks HEAD, we fall back to GET.
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok) return;
      throw new Error(`${code}: ${url} returned ${head.status}`);
    } catch {
      try {
        const get = await fetch(url, { method: "GET" });
        if (get.ok) return;
        throw new Error(`${code}: ${url} returned ${get.status}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`${code}: ${msg}`);
      }
    }
  }
}

export type GesturePipelineState =
  | { kind: "starting" }
  | { kind: "model-loading" }
  | { kind: "runtime-missing"; component: "model" | "labels" | "mediapipe-assets"; message: string }
  | { kind: "model-load-failed"; message: string }
  | { kind: "inference-failed"; message: string }
  | { kind: "running"; modelLoaded: boolean; labelsLoaded: boolean; cameraActive: boolean }
  | { kind: "hand-not-detected" }
  | { kind: "sign-unclear"; threshold: number }
  | { kind: "stopped" };

