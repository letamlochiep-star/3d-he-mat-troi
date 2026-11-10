import { STRINGS_VI } from './strings.vi';
import { SpeechService } from '../guide/SpeechService';

/**
 * Khung phụ đề hiển thị lời nói của Hướng dẫn viên ở đáy màn hình (F3.4)
 */
export class SubtitleHUD {
  private readonly container: HTMLElement;
  private readonly speechService: SpeechService;
  private guideName: string;
  private isVisible = false;

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
      max-width: 680px;
      width: calc(100% - 40px);
      background: rgba(13, 17, 24, 0.94);
      border: 1px solid rgba(212, 163, 89, 0.5);
      border-left: 4px solid #d4a359;
      border-radius: 12px;
      padding: 16px 20px;
      color: #f8fafc;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 150;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(this.container);

    this.attachEventListeners();
  }

  public setGuideName(name: string): void {
    this.guideName = name;
  }

  public showText(text: string): void {
    this.isVisible = true;
    this.render(text);

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
    this.container.style.pointerEvents = 'none';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => {
      if (!this.isVisible) {
        this.container.style.display = 'none';
      }
    }, 320);
  }

  private render(text: string): void {
    const isMuted = this.speechService.getIsMuted();
    const muteLabel = isMuted ? STRINGS_VI.btnUnmuteSpeech : STRINGS_VI.btnMuteSpeech;
    const muteIcon = isMuted ? '🔇' : '🔊';

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🎙️</span>
          <strong style="font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #d4a359;">
            ${this.guideName} (${STRINGS_VI.guideRole})
          </strong>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Nút Tắt tiếng / Bật tiếng -->
          <button type="button" id="btn-toggle-mute" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
            <span>${muteIcon}</span> <span>${muteLabel}</span>
          </button>

          <!-- Nút Bỏ qua lời nói -->
          <button type="button" id="btn-skip-speech" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 4px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
            <span>⏭️</span> <span>${STRINGS_VI.btnSkipSpeech}</span>
          </button>
        </div>
      </div>

      <!-- Nội dung phụ đề (Cỡ chữ thân bài >= 16px, ở đây là 17px) -->
      <div style="font-size: 17px; line-height: 1.55; color: #f1f5f9; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
        "${text}"
      </div>
    `;

    this.container.querySelector('#btn-toggle-mute')?.addEventListener('click', () => {
      this.speechService.toggleMute();
      this.render(text);
    });

    this.container.querySelector('#btn-skip-speech')?.addEventListener('click', () => {
      this.speechService.stop();
      this.hide();
    });
  }

  private attachEventListeners(): void {
    // Phím tắt M (Mute) và S (Skip)
    window.addEventListener('keydown', (e) => {
      // Chỉ kích hoạt khi không ở trong ô nhập liệu (chat input)
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyM') {
        this.speechService.toggleMute();
        if (this.isVisible) {
          const currentTextEl = this.container.querySelector('div[style*="font-size: 17px"]');
          const currentText = currentTextEl?.textContent?.replace(/^"|"$/g, '') || '';
          this.render(currentText);
        }
      }

      if (e.code === 'KeyS' && this.isVisible) {
        this.speechService.stop();
        this.hide();
      }
    });
  }
}
