/**
 * Dịch vụ xử lý giọng nói tiếng Việt (F3.4)
 * Tích hợp Web Speech API (vi-VN), phát tệp âm thanh audio nếu có, hỗ trợ tắt tiếng và ngắt lời
 */
export class SpeechService {
  private isMuted = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private vietnameseVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking = false;
  private speechTimerId: number | null = null;

  private onStateChangeListeners: Set<(isSpeaking: boolean, text: string) => void> = new Set();

  constructor() {
    this.initVoices();
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Ưu tiên giọng vi-VN hoặc giọng có mã ngôn ngữ bắt đầu bằng 'vi'
      const viVoice = voices.find((v) => v.lang === 'vi-VN' || v.lang === 'vi_VN' || v.lang.startsWith('vi'));
      if (viVoice) {
        this.vietnameseVoice = viVoice;
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public addListener(listener: (isSpeaking: boolean, text: string) => void): void {
    this.onStateChangeListeners.add(listener);
  }

  public removeListener(listener: (isSpeaking: boolean, text: string) => void): void {
    this.onStateChangeListeners.delete(listener);
  }

  private notifyState(isSpeaking: boolean, text: string): void {
    this.isSpeaking = isSpeaking;
    this.onStateChangeListeners.forEach((l) => l(isSpeaking, text));
  }

  /**
   * Phát giọng nói tiếng Việt hoặc phát tệp audio nếu có (F3.4)
   */
  public speak(
    text: string,
    audioUrl?: string | null,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    this.stop();

    if (!text.trim()) return;

    // 1. Ưu tiên phát tệp audio nếu dữ liệu có
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.muted = this.isMuted;

        audio.onplay = () => {
          this.notifyState(true, text);
          onStart?.();
        };

        audio.onended = () => {
          this.currentAudio = null;
          this.notifyState(false, '');
          onEnd?.();
        };

        audio.onerror = () => {
          // Lỗi tệp audio -> fallback sang Web Speech API
          this.currentAudio = null;
          this.speakWithSpeechSynthesis(text, onStart, onEnd);
        };

        audio.play().catch(() => {
          this.speakWithSpeechSynthesis(text, onStart, onEnd);
        });
        return;
      } catch (e) {
        console.warn('Lỗi mở tệp audio:', e);
      }
    }

    // 2. Phát qua Web Speech API
    this.speakWithSpeechSynthesis(text, onStart, onEnd);
  }

  private speakWithSpeechSynthesis(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // Máy không hỗ trợ Web Speech API -> Chỉ hiện phụ đề
      this.simulateSpeechProgress(text, onStart, onEnd);
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    if (this.vietnameseVoice) {
      utterance.voice = this.vietnameseVoice;
    }
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95; // Tốc độ đọc tự nhiên, ấm áp
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.notifyState(true, text);
      onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.notifyState(false, '');
      onEnd?.();
    };

    utterance.onerror = (e) => {
      // Tránh báo lỗi khi ngắt giữa chừng
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e);
      }
      this.currentUtterance = null;
      this.notifyState(false, '');
      onEnd?.();
    };

    if (this.isMuted) {
      // Nếu đang tắt tiếng: Chỉ hiện phụ đề mà không phát tiếng
      this.simulateSpeechProgress(text, onStart, onEnd);
    } else {
      synth.speak(utterance);
    }
  }

  /**
   * Mô phỏng tiến độ đọc chữ khi máy không có giọng hoặc đang tắt tiếng
   */
  private simulateSpeechProgress(text: string, onStart?: () => void, onEnd?: () => void): void {
    this.notifyState(true, text);
    onStart?.();

    // Tính thời gian đọc trung bình khoảng 3.5 từ / giây
    const wordsCount = text.split(/\s+/).length;
    const durationMs = Math.max(3000, Math.min(15000, (wordsCount / 3.2) * 1000));

    this.speechTimerId = window.setTimeout(() => {
      this.speechTimerId = null;
      this.notifyState(false, '');
      onEnd?.();
    }, durationMs);
  }

  /**
   * Ngắt lời ngay lập tức (khi bấm "Bỏ qua" hoặc chuyển phòng)
   */
  public stop(): void {
    if (this.speechTimerId !== null) {
      clearTimeout(this.speechTimerId);
      this.speechTimerId = null;
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.currentUtterance = null;
    if (this.isSpeaking) {
      this.notifyState(false, '');
    }
  }
}
