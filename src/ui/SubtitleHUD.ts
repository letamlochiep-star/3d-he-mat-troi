import { STRINGS_VI } from './strings.vi';
import { SpeechService } from '../guide/SpeechService';

export interface StorySubtitleOptions {
  title?: string;
  sentenceIndex?: number;
  totalSentences?: number;
  onPauseToggle?: () => void;
  onReplay?: () => void;
}

/**
 * Khung phụ đề hiển thị lời nói và câu chuyện của Hướng dẫn viên ở đáy màn hình (F3.4, F3.6)
 */
export class SubtitleHUD {
  private readonly container: HTMLElement;
  private readonly speechService: SpeechService;
  private guideName: string;
  private isVisible = false;
  private currentText = '';
  private currentOptions: StorySubtitleOptions | null = null;

  constructor(speechService: SpeechService, guideName = 'Anh Minh') {
    this.speechService = speechService;
    this.guideName = guideName;

    this.container = document.createElement('div');
    this.container.id = 'guide-subtitle-hud';
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(16px);
      max-width: 720px;
      width: calc(100% - 32px);
      background: rgba(13, 17, 24, 0.96);
      border: 1px solid rgba(212, 163, 89, 0.5);
      border-left: 4px solid #d4a359;
      border-radius: 12px;
      padding: 16px 20px;
      color: #f8fafc;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 150;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-sizing: border-box;
    `;
    document.body.appendChild(this.container);

    this.attachEventListeners();
  }

  public setGuideName(name: string): void {
    this.guideName = name;
  }

  public showText(text: string, options?: StorySubtitleOptions): void {
    this.currentText = text;
    this.currentOptions = options || null;
    this.isVisible = true;
    this.render();

    this.container.style.pointerEvents = 'auto';
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateX(-50%) translateY(0)';
    });
  }

  public hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.currentOptions = null;
    this.container.style.pointerEvents = 'none';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => {
      if (!this.isVisible) {
        this.container.style.display = 'none';
      }
    }, 320);
  }

  private render(): void {
    const isMuted = this.speechService.getIsMuted();
    const isPaused = this.speechService.isPaused();
    const muteLabel = isMuted ? STRINGS_VI.btnUnmuteSpeech : STRINGS_VI.btnMuteSpeech;
    const muteIcon = isMuted ? '🔇' : '🔊';

    const opts = this.currentOptions;
    const isStory = opts && opts.title;

    let titleTag = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${isStory ? '📖' : '🎙️'}</span>
        <strong style="font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #d4a359;">
          ${this.guideName} ${isStory ? `• ${opts.title}` : `(${STRINGS_VI.guideRole})`}
        </strong>
        ${
          opts && opts.sentenceIndex !== undefined && opts.totalSentences
            ? `<span style="font-size: 12px; color: #94a3b8; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">Câu ${opts.sentenceIndex + 1}/${opts.totalSentences}</span>`
            : ''
        }
      </div>
    `;

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        ${titleTag}

        <div style="display: flex; align-items: center; gap: 6px;">
          ${
            isStory
              ? `
              <!-- Nút Tạm dừng / Tiếp tục kể chuyện (F3.6) -->
              <button type="button" id="btn-pause-story" style="background: rgba(56, 139, 253, 0.15); border: 1px solid rgba(56, 139, 253, 0.4); color: #79c0ff; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
                <span>${isPaused ? '▶️' : '⏸️'}</span> <span>${isPaused ? STRINGS_VI.btnResumeStory : STRINGS_VI.btnPauseStory}</span>
              </button>

              <!-- Nút Nghe lại (F3.6) -->
              <button type="button" id="btn-replay-story" style="background: rgba(212, 163, 89, 0.15); border: 1px solid rgba(212, 163, 89, 0.4); color: #fef0cd; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
                <span>🔁</span> <span>${STRINGS_VI.btnReplayStory}</span>
              </button>
              `
              : ''
          }

          <!-- Nút Tắt tiếng / Bật tiếng -->
          <button type="button" id="btn-toggle-mute" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
            <span>${muteIcon}</span> <span>${muteLabel}</span>
          </button>

          <!-- Nút Bỏ qua lời nói -->
          <button type="button" id="btn-skip-speech" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
            <span>${isStory ? '✕' : '⏭️'}</span> <span>${isStory ? STRINGS_VI.btnCloseStory : STRINGS_VI.btnSkipSpeech}</span>
          </button>
        </div>
      </div>

      <!-- Nội dung phụ đề (Cỡ chữ thân bài >= 16px, ở đây là 17px) -->
      <div style="font-size: 17px; line-height: 1.55; color: #f1f5f9; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
        "${this.currentText}"
      </div>
    `;

    this.container.querySelector('#btn-toggle-mute')?.addEventListener('click', () => {
      this.speechService.toggleMute();
      this.render();
    });

    this.container.querySelector('#btn-skip-speech')?.addEventListener('click', () => {
      this.speechService.stop();
      this.hide();
    });

    if (isStory) {
      this.container.querySelector('#btn-pause-story')?.addEventListener('click', () => {
        if (this.speechService.isPaused()) {
          this.speechService.resume();
        } else {
          this.speechService.pause();
        }
        opts.onPauseToggle?.();
        this.render();
      });

      this.container.querySelector('#btn-replay-story')?.addEventListener('click', () => {
        this.speechService.replaySentences();
        opts.onReplay?.();
        this.render();
      });
    }
  }

  private attachEventListeners(): void {
    // Phím tắt M (Mute), S (Skip), P (Pause/Resume Story)
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyM') {
        this.speechService.toggleMute();
        if (this.isVisible) {
          this.render();
        }
      }

      if (e.code === 'KeyS' && this.isVisible && !this.currentOptions?.title) {
        this.speechService.stop();
        this.hide();
      }

      if (e.code === 'KeyP' && this.isVisible && this.currentOptions?.title) {
        if (this.speechService.isPaused()) {
          this.speechService.resume();
        } else {
          this.speechService.pause();
        }
        this.currentOptions?.onPauseToggle?.();
        this.render();
      }
    });
  }
}
