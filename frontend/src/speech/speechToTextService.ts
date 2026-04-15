export type SpeechToTextResult = {
  text: string;
  confidence?: number;
  isFinal: boolean;
};

type TranscriptCallback = (result: SpeechToTextResult) => void;

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class SpeechToTextService {
  private recognition: SpeechRecognition | null = null;
  private transcriptCb: TranscriptCallback | null = null;
  private listening = false;
  private permissionDenied = false;
  private unsupported = false;

  isSupported(): boolean {
    return Boolean(getRecognitionCtor());
  }

  onTranscript(cb: TranscriptCallback) {
    this.transcriptCb = cb;
  }

  handleUnsupportedBrowser() {
    this.unsupported = true;
  }

  handlePermissionError() {
    this.permissionDenied = true;
  }

  getState() {
    return {
      listening: this.listening,
      permissionDenied: this.permissionDenied,
      unsupported: this.unsupported
    };
  }

  startRecognition(opts?: { language?: string; continuous?: boolean; interimResults?: boolean }) {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.handleUnsupportedBrowser();
      throw new Error("Speech recognition unsupported");
    }

    if (!this.recognition) {
      this.recognition = new Ctor();
      this.recognition.continuous = opts?.continuous ?? true;
      this.recognition.interimResults = opts?.interimResults ?? true;
      this.recognition.lang = opts?.language ?? "en-US";

      this.recognition.onresult = (evt: SpeechRecognitionEvent) => {
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const res = evt.results[i];
          const alt = res?.[0];
          const text = String(alt?.transcript ?? "").trim();
          if (!text) continue;
          this.transcriptCb?.({ text, confidence: alt?.confidence, isFinal: Boolean(res.isFinal) });
        }
      };

      this.recognition.onerror = (evt: SpeechRecognitionErrorEvent) => {
        const err = String((evt as SpeechRecognitionErrorEvent).error ?? "");
        if (err === "not-allowed" || err === "service-not-allowed") {
          this.handlePermissionError();
        } else if (err === "audio-capture") {
          this.handlePermissionError();
        }
      };

      this.recognition.onend = () => {
        const shouldContinue = this.listening && !this.permissionDenied && !this.unsupported;
        if (shouldContinue) {
          try {
            this.recognition?.start();
          } catch {
            // ignore
          }
        }
      };
    } else {
      // Update runtime options on an existing instance.
      if (opts?.language) this.recognition.lang = opts.language;
      if (typeof opts?.continuous === "boolean") this.recognition.continuous = opts.continuous;
      if (typeof opts?.interimResults === "boolean") this.recognition.interimResults = opts.interimResults;
    }

    this.listening = true;
    try {
      this.recognition.start();
    } catch {
      // Some browsers throw if already started; treat as "already listening".
    }
  }

  stopRecognition() {
    this.listening = false;
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
  }
}

