import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBanner } from "../components/StatusBanner";
import { ControlBar } from "../components/ControlBar";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { VideoPanel } from "../components/VideoPanel";
import { sessionCoordinator } from "../session/sessionCoordinator";
import { SpeechToTextService } from "../speech/speechToTextService";
import { TextToSpeechService } from "../speech/textToSpeechService";
import { GesturePipelineManager } from "../gesture/gesturePipelineManager";
import { PeerConnectionManager } from "../webrtc/peerConnectionManager";
import { getIceServers } from "../utils/env";
import { stableClientId } from "../utils/id";
export function CallPage(props) {
    const [conn, setConn] = useState("initializing-media");
    const [participantPresent, setParticipantPresent] = useState(false);
    const [error, setError] = useState(null);
    const [mediaWarning, setMediaWarning] = useState(null);
    const [localMediaReady, setLocalMediaReady] = useState(false);
    const [speechError, setSpeechError] = useState(null);
    const [listening, setListening] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [language, setLanguage] = useState("tr-TR");
    const [items, setItems] = useState([]);
    const [gestureState, setGestureState] = useState({ kind: "stopped" });
    const [gestureEnabled, setGestureEnabled] = useState(false);
    const [sttSupported, setSttSupported] = useState(true);
    const [ttsSupported, setTtsSupported] = useState(true);
    const socketRef = useRef(null);
    const sttRef = useRef(null);
    const ttsRef = useRef(null);
    const lastFinalRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pcRef = useRef(null);
    const gestureRef = useRef(null);
    const languageRef = useRef(language);
    const ttsEnabledRef = useRef(ttsEnabled);
    const negotiationRef = useRef({ started: false });
    function makeId() {
        const c = globalThis.crypto;
        return typeof c?.randomUUID === "function" ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    function appendTranscript(next) {
        const item = { id: makeId(), ...next };
        setItems((prev) => [...prev, item].slice(-200));
    }
    function appendSystem(text) {
        appendTranscript({
            createdAt: new Date().toISOString(),
            senderLabel: "System",
            kind: "system",
            text
        });
    }
    function appendFromRealtimeMessage(payload, senderLabel) {
        const text = String(payload?.text ?? "").trim();
        if (!text)
            return;
        const ts = payload?.createdAt ? new Date(payload.createdAt) : new Date();
        appendTranscript({
            createdAt: ts.toISOString(),
            senderLabel,
            origin: payload.origin,
            kind: "text",
            text
        });
    }
    function normalizeForFilename(s) {
        return s.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80);
    }
    function downloadTranscript() {
        const exportAt = new Date();
        const sorted = [...items].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        const lines = [];
        lines.push(`SignTalker transcript export`);
        lines.push(`Session token: ${props.token}`);
        lines.push(`Exported at: ${exportAt.toISOString()}`);
        lines.push(``);
        for (const it of sorted) {
            const ts = it.createdAt;
            const origin = it.kind === "text" ? it.origin ?? "typed" : "system";
            lines.push(`[${ts}] ${it.senderLabel} (${origin}): ${it.text}`);
        }
        lines.push(``);
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = exportAt.toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `signtalker-${normalizeForFilename(props.token)}-${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    function describeGestureFailure(message) {
        const m = message.toLowerCase();
        if (m.includes("404") || m.includes("failed to fetch")) {
            return "Gesture assets/model not found. For demo: copy MediaPipe Hands runtime files into `frontend/public/mediapipe/hands/` and place TFJS model files into `frontend/public/models/gesture/` (see README files in those folders).";
        }
        if (m.includes("mediapipe") || m.includes("hands")) {
            return "Gesture pipeline could not initialize MediaPipe Hands. Confirm the required runtime files exist under `frontend/public/mediapipe/hands/`.";
        }
        if (m.includes("model") || m.includes("graphmodel") || m.includes("layersmodel")) {
            return "Gesture model could not load. Confirm `VITE_GESTURE_MODEL_URL` points to a real TFJS `model.json` under `frontend/public/models/gesture/`.";
        }
        return message;
    }
    function describeMediaError(e) {
        const anyErr = e;
        const name = String(anyErr?.name ?? "");
        if (name === "NotAllowedError" || name === "PermissionDeniedError")
            return "Camera/microphone permission denied.";
        if (name === "NotFoundError" || name === "DevicesNotFoundError")
            return "No camera/microphone device found.";
        if (name === "NotReadableError")
            return "Camera/microphone is already in use by another app.";
        const msg = String(anyErr?.message ?? "");
        return msg ? `Media unavailable: ${msg}` : "Media unavailable.";
    }
    const banner = useMemo(() => {
        if (conn === "error")
            return _jsx(StatusBanner, { status: "error", title: "Could not join session", detail: error ?? undefined });
        if (conn === "initializing-media") {
            return _jsx(StatusBanner, { status: "warn", title: "Initializing media\u2026", detail: "Requesting camera + microphone permission." });
        }
        if (conn === "connecting") {
            return _jsx(StatusBanner, { status: "warn", title: "Connecting\u2026", detail: "Establishing peer connection." });
        }
        if (conn === "participant-left") {
            return _jsx(StatusBanner, { status: "warn", title: "Participant left", detail: `Token: ${props.token}` });
        }
        return (_jsx(StatusBanner, { status: participantPresent ? "ok" : "warn", title: conn === "connected"
                ? "Connected"
                : participantPresent || conn === "waiting"
                    ? "Waiting for participant…"
                    : "Ready", detail: `Token: ${props.token}` }));
    }, [conn, participantPresent, props.token, error]);
    useEffect(() => {
        let socket = null;
        let cancelled = false;
        async function run() {
            setConn("initializing-media");
            const v = await sessionCoordinator.validateSession(props.token);
            if (!v.valid) {
                setConn("error");
                setError(v.status === "expired" || v.reason === "TOKEN_EXPIRED" ? "Session expired" : "Invalid token");
                return;
            }
            if (v.status === "ended" || v.reason === "SESSION_ENDED") {
                setConn("error");
                setError("Session ended");
                return;
            }
            if (!v.joinable) {
                // Do not hard-block on "full" here: refresh/reconnect can momentarily validate as full
                // while the old socket disconnect is still in flight. The authoritative check happens
                // on socket join.
                if (v.reason === "SESSION_FULL" || v.participantCount >= 2) {
                    appendSystem("Session appears full. Attempting to (re)join…");
                }
                else {
                    setConn("error");
                    setError("Session not joinable");
                    return;
                }
            }
            let localStream = null;
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setMediaWarning(null);
                setLocalMediaReady(true);
            }
            catch (e) {
                const detail = describeMediaError(e);
                setMediaWarning(`${detail} You can still use typed messages, and speech/gesture if supported.`);
                setLocalMediaReady(false);
                appendSystem(`Media init warning: ${detail}`);
            }
            if (cancelled) {
                for (const t of localStream?.getTracks?.() ?? [])
                    t.stop();
                return;
            }
            localStreamRef.current = localStream;
            if (localStream && localVideoRef.current)
                localVideoRef.current.srcObject = localStream;
            socket = sessionCoordinator.joinSession(props.token);
            socketRef.current = socket;
            const createOrResetPc = () => {
                if (!localStream)
                    return null;
                pcRef.current?.closeConnection();
                const pc = new PeerConnectionManager({
                    onRemoteStream: (stream) => {
                        if (remoteVideoRef.current)
                            remoteVideoRef.current.srcObject = stream;
                    },
                    onLocalIceCandidate: (candidate) => {
                        socket?.emit("ice-candidate", candidate);
                    },
                    onConnectionStateChange: (state) => {
                        if (state === "connected") {
                            setConn("connected");
                            appendSystem("Peer connection established.");
                        }
                        else if (state === "connecting") {
                            setConn("connecting");
                        }
                        else if (state === "failed") {
                            setConn("error");
                            setError("Peer connection failed. (Tip: configure TURN for cross-network demos.)");
                            appendSystem(`Peer connection state: ${state}`);
                        }
                        else if (state === "disconnected") {
                            // Disconnected can be transient (wifi switch, tab background). Keep UI calm.
                            setConn((prev) => (prev === "connected" ? "connecting" : prev));
                            appendSystem("Peer connection disconnected. Attempting to recover…");
                        }
                    }
                });
                pc.initializeConnection({ localStream, iceServers: getIceServers() });
                pcRef.current = pc;
                negotiationRef.current.started = false;
                return pc;
            };
            createOrResetPc();
            const tts = new TextToSpeechService();
            tts.setLanguage(languageRef.current);
            tts.setEnabled(ttsEnabledRef.current);
            ttsRef.current = tts;
            const ttsOk = tts.isSupported();
            setTtsSupported(ttsOk);
            if (!ttsOk)
                appendSystem("TTS unavailable in this browser. Incoming sign messages will not be spoken.");
            const stt = new SpeechToTextService();
            sttRef.current = stt;
            const sttOk = stt.isSupported();
            setSttSupported(sttOk);
            if (!sttOk)
                appendSystem("STT unsupported in this browser. Use typed text fallback (bottom input).");
            stt.onTranscript((r) => {
                if (!r.isFinal)
                    return;
                const text = r.text.trim();
                if (!text)
                    return;
                const now = Date.now();
                const last = lastFinalRef.current;
                if (last && last.text === text && now - last.at < 1500)
                    return;
                lastFinalRef.current = { text, at: now };
                appendTranscript({
                    createdAt: new Date().toISOString(),
                    senderLabel: "You",
                    origin: "speech",
                    kind: "text",
                    text
                });
                const msg = {
                    id: makeId(),
                    sessionToken: props.token,
                    createdAt: new Date().toISOString(),
                    senderId: socket?.id ?? "local",
                    kind: "text",
                    text,
                    origin: "speech"
                };
                socket?.emit("message", msg);
            });
            socket.on("session-joined", (payload) => {
                const count = payload?.participantCount ?? 0;
                const present = count >= 2;
                setParticipantPresent(present);
                setConn(present && pcRef.current ? "connecting" : "waiting");
                appendSystem("Joined session.");
            });
            socket.on("participant-joined", async () => {
                setParticipantPresent(true);
                setConn("connecting");
                appendSystem("Participant joined.");
                void maybeStartNegotiation("participant-joined");
            });
            socket.on("participant-reconnected", async () => {
                // Existing peer refreshed or temporarily disconnected. Restart negotiation from our side.
                appendSystem("Participant reconnected.");
                setParticipantPresent(true);
                setConn("connecting");
                void maybeStartNegotiation("participant-reconnected");
            });
            socket.on("participant-left", () => {
                setParticipantPresent(false);
                setConn("participant-left");
                appendSystem("Participant left.");
                pcRef.current?.closeConnection();
                pcRef.current = null;
                // Keep local media alive so user can wait/reconnect; peer connection will likely go to disconnected/failed.
            });
            socket.on("invalid-session", (payload) => {
                setConn("error");
                setError(payload?.error?.message ?? "Invalid session");
            });
            socket.on("session-ended", () => {
                appendSystem("Session ended by participant.");
                setConn("error");
                setError("Session ended");
            });
            socket.on("connect", () => {
                appendSystem("Socket connected.");
                // Socket.io can reconnect without a full page reload; ensure we are re-joined.
                socket?.emit("join-session", { token: props.token, clientId: stableClientId() });
            });
            socket.on("disconnect", (reason) => {
                appendSystem(`Socket disconnected (${reason}). Reconnecting…`);
            });
            socket.on("connect_error", () => {
                appendSystem("Socket connection error. Retrying…");
            });
            socket.on("offer", async (offer) => {
                appendSystem("Received offer.");
                const pc = pcRef.current;
                if (!pc) {
                    appendSystem("Cannot accept offer: local media is unavailable.");
                    return;
                }
                try {
                    await pc.rollbackLocalOfferIfNeeded();
                    await pc.handleRemoteDescription(offer);
                    const answer = await pc.createAnswer();
                    socket?.emit("answer", answer);
                    setConn("connecting");
                }
                catch (e) {
                    setConn("error");
                    setError("Failed to handle WebRTC offer.");
                    appendSystem(`Offer handling error: ${String(e)}`);
                }
            });
            socket.on("answer", async (answer) => {
                appendSystem("Received answer.");
                const pc = pcRef.current;
                if (!pc)
                    return;
                try {
                    await pc.handleRemoteDescription(answer);
                    setConn("connecting");
                }
                catch (e) {
                    setConn("error");
                    setError("Failed to handle WebRTC answer.");
                    appendSystem(`Answer handling error: ${String(e)}`);
                }
            });
            socket.on("ice-candidate", async (candidate) => {
                const pc = pcRef.current;
                if (!pc)
                    return;
                try {
                    await pc.addIceCandidate(candidate);
                }
                catch {
                    // ignore
                }
            });
            socket.on("message", (payload) => {
                appendFromRealtimeMessage(payload, "Peer");
                if (payload.origin === "sign") {
                    try {
                        tts.speak(String(payload?.text ?? ""), languageRef.current);
                    }
                    catch {
                        // ignore
                    }
                }
            });
            // Setup gesture pipeline manager (client-side only).
            gestureRef.current = new GesturePipelineManager({
                onState: (s) => setGestureState(s),
                onPrediction: (r) => {
                    appendTranscript({
                        createdAt: r.recognizedAt,
                        senderLabel: "You",
                        origin: "sign",
                        kind: "text",
                        text: r.label
                    });
                    const msg = {
                        id: makeId(),
                        sessionToken: props.token,
                        createdAt: r.recognizedAt,
                        senderId: socket?.id ?? "local",
                        kind: "text",
                        text: r.label,
                        origin: "sign"
                    };
                    socket?.emit("message", msg);
                }
            });
        }
        async function maybeStartNegotiation(source) {
            const s = socketRef.current;
            const pc = pcRef.current;
            if (!s || !pc)
                return;
            if (negotiationRef.current.started)
                return;
            if (pc.getSignalingState() && pc.getSignalingState() !== "stable") {
                // Avoid offer storms; we'll rely on the next reconnect/join event.
                return;
            }
            negotiationRef.current.started = true;
            appendSystem(`Starting negotiation (${source})…`);
            try {
                const offer = await pc.createOffer();
                s.emit("offer", offer);
            }
            catch (e) {
                negotiationRef.current.started = false;
                setConn("error");
                setError("Failed to create WebRTC offer.");
                appendSystem(`Offer error: ${String(e)}`);
            }
        }
        void run();
        return () => {
            cancelled = true;
            gestureRef.current?.stopPipeline();
            gestureRef.current = null;
            pcRef.current?.closeConnection();
            pcRef.current = null;
            for (const t of localStreamRef.current?.getTracks?.() ?? [])
                t.stop();
            localStreamRef.current = null;
            if (localVideoRef.current)
                localVideoRef.current.srcObject = null;
            if (remoteVideoRef.current)
                remoteVideoRef.current.srcObject = null;
            sttRef.current?.stopRecognition();
            ttsRef.current?.stopSpeaking();
            sttRef.current = null;
            ttsRef.current = null;
            if (socket)
                socket.removeAllListeners();
            socketRef.current = null;
            sessionCoordinator.leaveSession();
        };
    }, [props.token]);
    useEffect(() => {
        languageRef.current = language;
        ttsRef.current?.setLanguage(language);
    }, [language]);
    useEffect(() => {
        ttsEnabledRef.current = ttsEnabled;
        ttsRef.current?.setEnabled(ttsEnabled);
        if (!ttsEnabled)
            ttsRef.current?.stopSpeaking();
    }, [ttsEnabled]);
    useEffect(() => {
        async function syncGesture() {
            const mgr = gestureRef.current;
            const video = localVideoRef.current;
            if (!mgr || !video)
                return;
            if (gestureEnabled) {
                await mgr.startPipeline(video);
            }
            else {
                await mgr.stopPipeline();
            }
        }
        void syncGesture();
    }, [gestureEnabled]);
    function sendTypedText(text) {
        const socket = socketRef.current;
        const t = text.trim();
        if (!t)
            return;
        appendTranscript({
            createdAt: new Date().toISOString(),
            senderLabel: "You",
            origin: "typed",
            kind: "text",
            text: t
        });
        const msg = {
            id: makeId(),
            sessionToken: props.token,
            createdAt: new Date().toISOString(),
            senderId: socket?.id ?? "local",
            kind: "text",
            text: t,
            origin: "typed"
        };
        socket?.emit("message", msg);
    }
    async function onEnd() {
        try {
            socketRef.current?.emit("session-ended", { token: props.token });
        }
        catch {
            // ignore
        }
        try {
            await sessionCoordinator.endSession(props.token);
        }
        catch {
            // ignore: still exit locally
        }
        finally {
            props.onExit();
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [banner, _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsx(VideoPanel, { label: "You (local)", videoRef: localMediaReady ? localVideoRef : undefined, placeholder: "Camera/microphone unavailable (text-only mode)." }), _jsx(VideoPanel, { label: "Peer (remote)", videoRef: localMediaReady ? remoteVideoRef : undefined, placeholder: localMediaReady ? "Waiting for peer media…" : "Peer media unavailable (text-only mode)." })] }), !sttSupported ? (_jsx(StatusBanner, { status: "warn", title: "STT unsupported", detail: "Speech recognition is not available in this browser. Use typed text fallback, or try a Chromium-based browser." })) : null, mediaWarning ? _jsx(StatusBanner, { status: "warn", title: "Media unavailable", detail: mediaWarning }) : null, !ttsSupported ? (_jsx(StatusBanner, { status: "warn", title: "TTS unavailable", detail: "Speech synthesis is not available in this browser. Incoming sign messages will still show in the transcript." })) : null, speechError ? _jsx(StatusBanner, { status: "error", title: "Speech", detail: speechError }) : null, gestureState.kind === "model-loading" ? _jsx(StatusBanner, { status: "warn", title: "Gesture model", detail: "Loading\u2026" }) : null, gestureState.kind === "runtime-missing" ? (_jsx(StatusBanner, { status: gestureState.component === "labels" ? "warn" : "error", title: gestureState.component === "model"
                    ? "Gesture model missing"
                    : gestureState.component === "mediapipe-assets"
                        ? "MediaPipe assets missing"
                        : "Gesture labels missing", detail: describeGestureFailure(gestureState.message) })) : null, gestureState.kind === "model-load-failed" ? (_jsx(StatusBanner, { status: "error", title: "Gesture pipeline unavailable", detail: describeGestureFailure(gestureState.message) })) : null, gestureState.kind === "inference-failed" ? (_jsx(StatusBanner, { status: "error", title: "Gesture inference failed", detail: "The gesture model loaded but inference failed. Typed/STT messaging still works." })) : null, gestureState.kind === "hand-not-detected" ? _jsx(StatusBanner, { status: "warn", title: "Gesture pipeline", detail: "Hand not detected" }) : null, gestureState.kind === "sign-unclear" ? (_jsx(StatusBanner, { status: "warn", title: "Gesture pipeline", detail: `Sign unclear (threshold ${gestureState.threshold})` })) : null, gestureState.kind === "stopped" && gestureEnabled ? _jsx(StatusBanner, { status: "warn", title: "Gesture pipeline", detail: "Stopped" }) : null, _jsx(TranscriptPanel, { items: items, onDownload: downloadTranscript }), _jsx("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "text-xs text-slate-300", children: "Gesture controls" }), _jsx("div", { className: "rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-xs text-slate-200", children: gestureEnabled ? "Enabled" : "Disabled" }), _jsx("button", { className: "rounded-md bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white", disabled: !localMediaReady, onClick: () => {
                                        if (!localMediaReady) {
                                            appendSystem("Gesture pipeline requires camera access.");
                                            return;
                                        }
                                        setGestureEnabled((v) => !v);
                                    }, children: gestureEnabled ? "Stop gesture" : "Start gesture" })] }), _jsx("div", { className: "text-xs text-slate-400", children: "All gesture extraction + inference runs locally in your browser (no uploads)." })] }) }), _jsx("div", { className: "rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "text-xs text-slate-300", children: "Speech controls" }), _jsx("div", { className: "rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-xs text-slate-200", children: listening ? "Listening" : "Not listening" }), _jsx("button", { className: "rounded-md bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60", onClick: () => {
                                        const stt = sttRef.current;
                                        if (!stt) {
                                            setSpeechError("Speech recognition unavailable.");
                                            return;
                                        }
                                        if (!stt.isSupported()) {
                                            setSpeechError("Speech recognition is not supported in this browser.");
                                            return;
                                        }
                                        try {
                                            if (listening) {
                                                stt.stopRecognition();
                                                setListening(false);
                                            }
                                            else {
                                                setSpeechError(null);
                                                stt.startRecognition({ language, continuous: true, interimResults: true });
                                                const s = stt.getState();
                                                if (s.permissionDenied)
                                                    setSpeechError("Microphone permission denied for speech recognition.");
                                                if (s.unsupported)
                                                    setSpeechError("Speech recognition is not supported in this browser.");
                                                setListening(true);
                                            }
                                        }
                                        catch {
                                            setSpeechError("Speech recognition unavailable.");
                                        }
                                    }, children: listening ? "Stop mic" : "Start mic" }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-200", children: [_jsx("input", { type: "checkbox", checked: ttsEnabled, onChange: (e) => {
                                                const v = e.target.checked;
                                                setTtsEnabled(v);
                                                ttsRef.current?.setEnabled(v);
                                                if (!v)
                                                    ttsRef.current?.stopSpeaking();
                                            } }), "TTS"] }), _jsxs("select", { className: "rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100", value: language, onChange: (e) => {
                                        const v = e.target.value ?? "tr-TR";
                                        setLanguage(v);
                                        ttsRef.current?.setLanguage(v);
                                    }, children: [_jsx("option", { value: "tr-TR", children: "T\u00FCrk\u00E7e" }), _jsx("option", { value: "en-US", children: "English" })] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsx("button", { onClick: () => {
                                    if (!ttsRef.current?.isSupported()) {
                                        setSpeechError("Speech synthesis is not supported in this browser.");
                                        return;
                                    }
                                    try {
                                        ttsRef.current?.speak("Test", language);
                                    }
                                    catch {
                                        setSpeechError("Speech synthesis unavailable.");
                                    }
                                }, className: "rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-950", children: "Test TTS" }) })] }) }), _jsx(ControlBar, { onEnd: () => void onEnd(), onDownloadTranscript: downloadTranscript, onSendText: sendTypedText, canSend: conn !== "error" && conn !== "initializing-media" })] }));
}
