// Dịch vụ nhận diện giọng nói tiếng Việt sử dụng Web Speech API

// Định nghĩa kiểu cho Web Speech API để TypeScript không báo lỗi
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface VoiceInputCallbacks {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class VoiceInputService {
  private recognition: any = null;
  private listening: boolean = false;
  private callbacks: VoiceInputCallbacks = {};

  constructor(callbacks?: VoiceInputCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
    this.initRecognition();
  }

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private initRecognition(): void {
    if (!VoiceInputService.isSupported()) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.listening = true;
      if (this.callbacks.onStart) this.callbacks.onStart();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript && this.callbacks.onResult) {
        this.callbacks.onResult(finalTranscript.trim(), true);
      } else if (interimTranscript && this.callbacks.onResult) {
        this.callbacks.onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.listening = false;
      const errorMsg = event.error || 'Lỗi nhận diện giọng nói';
      if (this.callbacks.onError) this.callbacks.onError(errorMsg);
    };

    this.recognition.onend = () => {
      this.listening = false;
      if (this.callbacks.onEnd) this.callbacks.onEnd();
    };
  }

  public setCallbacks(callbacks: VoiceInputCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public start(): boolean {
    if (!this.recognition) return false;
    if (this.listening) return true;

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('Không thể bắt đầu nhận diện giọng nói:', err);
      return false;
    }
  }

  public stop(): void {
    if (!this.recognition || !this.listening) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.warn('Lỗi khi dừng nhận diện giọng nói:', err);
    }
    this.listening = false;
  }

  public isListening(): boolean {
    return this.listening;
  }
}
