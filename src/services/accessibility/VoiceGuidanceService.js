export class VoiceGuidanceService {
  constructor({ speechSynthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance } = {}) {
    this.speechSynthesis = speechSynthesis;
    this.Utterance = Utterance;
  }

  isSupported() {
    return Boolean(this.speechSynthesis && this.Utterance);
  }

  speak(text, { rate = 0.95, onEnd, onError } = {}) {
    if (!this.isSupported()) return false;
    this.cancel();
    const utterance = new this.Utterance(String(text));
    utterance.rate = rate;
    utterance.lang = "en-US";
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onError?.();
    this.speechSynthesis.speak(utterance);
    return true;
  }

  cancel() { this.speechSynthesis?.cancel(); }
  isSpeaking() { return Boolean(this.speechSynthesis?.speaking); }
}
