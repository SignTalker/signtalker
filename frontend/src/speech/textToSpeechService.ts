export class TextToSpeechService {
  private language: string = "en-US";
  private enabled = true;

  isSupported(): boolean {
    return "speechSynthesis" in window;
  }

  setLanguage(language: string) {
    this.language = language;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  speak(text: string, language?: string): void {
    if (!this.enabled) return;
    if (!this.isSupported()) throw new Error("Speech synthesis unsupported");
    const t = String(text ?? "").trim();
    if (!t) return;

    const utter = new SpeechSynthesisUtterance(t);
    utter.lang = language ?? this.language;
    window.speechSynthesis.speak(utter);
  }

  stopSpeaking() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
  }
}

