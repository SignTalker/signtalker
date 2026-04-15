export class PeerConnectionManager {
    pc = null;
    remoteStream = null;
    cb;
    remoteTrackIds = new Set();
    pendingRemoteIce = [];
    remoteDescriptionSet = false;
    constructor(cb) {
        this.cb = cb;
    }
    initializeConnection(opts) {
        this.closeConnection();
        this.remoteStream = new MediaStream();
        this.pc = new RTCPeerConnection({
            iceServers: opts.iceServers ?? []
        });
        this.remoteDescriptionSet = false;
        this.pendingRemoteIce = [];
        for (const track of opts.localStream.getTracks()) {
            this.pc.addTrack(track, opts.localStream);
        }
        this.pc.onicecandidate = (evt) => {
            if (!evt.candidate)
                return;
            this.cb.onLocalIceCandidate?.(evt.candidate.toJSON());
        };
        this.pc.ontrack = (evt) => {
            if (!this.remoteStream)
                this.remoteStream = new MediaStream();
            const tracks = evt.streams?.[0]?.getTracks?.() ?? (evt.track ? [evt.track] : []);
            for (const t of tracks) {
                if (this.remoteTrackIds.has(t.id))
                    continue;
                this.remoteTrackIds.add(t.id);
                this.remoteStream.addTrack(t);
            }
            this.cb.onRemoteStream?.(this.remoteStream);
        };
        this.pc.onconnectionstatechange = () => {
            if (!this.pc)
                return;
            this.cb.onConnectionStateChange?.(this.pc.connectionState);
        };
    }
    getSignalingState() {
        return this.pc?.signalingState ?? null;
    }
    async rollbackLocalOfferIfNeeded() {
        if (!this.pc)
            return;
        if (this.pc.signalingState !== "have-local-offer")
            return;
        // Best-effort glare handling: accept the remote offer by rolling back ours.
        try {
            // TS libdom allows rollback but type definitions can be strict across versions.
            await this.pc.setLocalDescription({ type: "rollback" });
        }
        catch {
            // ignore
        }
    }
    async createOffer() {
        if (!this.pc)
            throw new Error("Peer connection not initialized");
        if (this.pc.signalingState !== "stable")
            throw new Error(`Cannot create offer in state ${this.pc.signalingState}`);
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        if (!this.pc.localDescription)
            throw new Error("Missing localDescription after createOffer");
        return this.pc.localDescription.toJSON();
    }
    async createAnswer() {
        if (!this.pc)
            throw new Error("Peer connection not initialized");
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        if (!this.pc.localDescription)
            throw new Error("Missing localDescription after createAnswer");
        return this.pc.localDescription.toJSON();
    }
    async handleRemoteDescription(description) {
        if (!this.pc)
            throw new Error("Peer connection not initialized");
        await this.pc.setRemoteDescription(new RTCSessionDescription(description));
        this.remoteDescriptionSet = true;
        await this.flushPendingIce();
    }
    async addIceCandidate(candidate) {
        if (!this.pc)
            return;
        if (!candidate)
            return;
        // Browsers can deliver ICE before SDP; queue until remoteDescription is set.
        if (!this.remoteDescriptionSet || !this.pc.remoteDescription) {
            this.pendingRemoteIce.push(candidate);
            return;
        }
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    async flushPendingIce() {
        if (!this.pc)
            return;
        if (!this.remoteDescriptionSet || !this.pc.remoteDescription)
            return;
        const pending = this.pendingRemoteIce;
        this.pendingRemoteIce = [];
        for (const c of pending) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
            }
            catch {
                // Ignore malformed/stale ICE; common during reconnect/teardown races.
            }
        }
    }
    closeConnection() {
        if (this.pc) {
            this.pc.onicecandidate = null;
            this.pc.ontrack = null;
            this.pc.onconnectionstatechange = null;
            try {
                this.pc.close();
            }
            catch {
                // ignore
            }
        }
        this.pc = null;
        this.remoteStream = null;
        this.remoteTrackIds.clear();
        this.pendingRemoteIce = [];
        this.remoteDescriptionSet = false;
    }
}
