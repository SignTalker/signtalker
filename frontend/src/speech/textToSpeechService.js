export class TextToSpeechService {
    language = "en-US";
    enabled = true;
    isSupported() {
        return "speechSynthesis" in window;
    }
    setLanguage(language) {
        this.language = language;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    speak(text, language) {
        if (!this.enabled)
            return;
        if (!this.isSupported())
            throw new Error("Speech synthesis unsupported");
        const t = String(text ?? "").trim();
        if (!t)
            return;
        const utter = new SpeechSynthesisUtterance(t);
        utter.lang = language ?? this.language;
        window.speechSynthesis.speak(utter);
    }
    stopSpeaking() {
        if (!this.isSupported())
            return;
        window.speechSynthesis.cancel();
    }
}
