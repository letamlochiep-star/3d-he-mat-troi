/**
 * Dịch vụ xử lý giọng nói tiếng Việt (F3.4, F3.5, F3.6)
 * Tích hợp Web Speech API (vi-VN), phát tệp âm thanh audio nếu có,
 * hỗ trợ tắt tiếng, ngắt lời, đọc từng câu theo hàng đợi (kể chuyện story),
 * tạm dừng (pause), tiếp tục (resume) và nghe lại (replay).
 */
export class SpeechService {
  private isMuted = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private vietnameseVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking = false;
  private isPausedState = false;
  private speechTimerId: number | null = null;

  // Quản lý đọc theo câu cho chế độ kể chuyện (F3.6)
  private sentencesQueue: string[] = [];
  private currentSentenceIdx = 0;
  private onSentenceCallback: ((idx: number, sentence: string, total: number) => void) | null = null;
  private onQueueCompleteCallback: (() => void) | null = null;

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

  public isPaused(): boolean {
    return this.isPausedState;
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
   * Tạm dừng đọc giọng nói (F3.6)
   */
  public pause(): void {
    if (!this.isSpeaking || this.isPausedState) return;

    this.isPausedState = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Tiếp tục đọc sau khi tạm dừng (F3.6)
   */
  public resume(): void {
    if (!this.isPausedState) return;

    this.isPausedState = false;
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
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
    this.isPausedState = false;

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

  /**
   * Phát câu chuyện chia nhỏ theo từng câu văn (F3.6)
   * Phụ đề sẽ cập nhật tương ứng theo từng câu văn đang đọc
   */
  public speakSentences(
    sentences: string[],
    onSentenceStart?: (idx: number, sentence: string, total: number) => void,
    onComplete?: () => void
  ): void {
    this.stop();
    this.isPausedState = false;

    this.sentencesQueue = sentences.filter((s) => s.trim().length > 0);
    this.currentSentenceIdx = 0;
    this.onSentenceCallback = onSentenceStart || null;
    this.onQueueCompleteCallback = onComplete || null;

    if (this.sentencesQueue.length === 0) {
      onComplete?.();
      return;
    }

    this.playNextSentence();
  }

  /**
   * Nghe lại toàn bộ câu chuyện hiện tại từ câu đầu tiên (F3.6)
   */
  public replaySentences(): void {
    if (this.sentencesQueue.length === 0) return;
    this.currentSentenceIdx = 0;
    this.isPausedState = false;
    this.playNextSentence();
  }

  private playNextSentence(): void {
    if (this.currentSentenceIdx >= this.sentencesQueue.length) {
      this.notifyState(false, '');
      this.onQueueCompleteCallback?.();
      return;
    }

    const sentence = this.sentencesQueue[this.currentSentenceIdx];
    const total = this.sentencesQueue.length;

    this.onSentenceCallback?.(this.currentSentenceIdx, sentence, total);

    this.speakWithSpeechSynthesis(
      sentence,
      () => {},
      () => {
        if (!this.isSpeaking && this.currentSentenceIdx >= this.sentencesQueue.length - 1) {
          // Đã hoàn thành toàn bộ
          this.currentSentenceIdx++;
          this.onQueueCompleteCallback?.();
        } else {
          // Chuyển sang câu tiếp theo
          this.currentSentenceIdx++;
          setTimeout(() => {
            if (this.isSpeaking || this.currentSentenceIdx < this.sentencesQueue.length) {
              this.playNextSentence();
            }
          }, 250); // Khoảng nghỉ tự nhiên giữa hai câu
        }
      }
    );
  }

  private speakWithSpeechSynthesis(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
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
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e);
      }
      this.currentUtterance = null;
      onEnd?.();
    };

    if (this.isMuted) {
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

    const wordsCount = text.split(/\s+/).length;
    const durationMs = Math.max(2500, Math.min(15000, (wordsCount / 3.2) * 1000));

    this.speechTimerId = window.setTimeout(() => {
      this.speechTimerId = null;
      onEnd?.();
    }, durationMs);
  }

  /**
   * Ngắt lời ngay lập tức (khi bấm "Bỏ qua", chuyển phòng hoặc dừng tour)
   */
  public stop(): void {
    this.isPausedState = false;

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
