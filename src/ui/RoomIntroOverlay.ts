import { RoomData } from '../types';
import { STRINGS_VI } from './strings.vi';

/**
 * Bảng thông tin giới thiệu phòng xuất hiện trong 6 giây khi bước vào phòng mới (F2.1)
 */
export class RoomIntroOverlay {
  private readonly container: HTMLElement;
  private timerId: number | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'room-intro-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 72px;
      left: 20px;
      max-width: 440px;
      width: calc(100% - 40px);
      background: rgba(15, 20, 30, 0.88);
      border: 1px solid rgba(212, 163, 89, 0.45);
      border-left: 4px solid #d4a359;
      border-radius: 10px;
      padding: 16px 20px;
      color: #f1f5f9;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 100;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(-12px);
      transition: opacity 0.4s ease, transform 0.4s ease;
      pointer-events: auto;
      display: none;
    `;
    document.body.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.container.style.display === 'block') {
        this.hide();
      }
    });
  }

  public show(room: RoomData): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    const exhibitsCount = room.exhibits ? room.exhibits.length : 0;

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #d4a359; font-weight: 700;">
          ${STRINGS_VI.roomIntroTitle}
        </div>
        <button id="btn-close-intro" aria-label="Đóng bảng giới thiệu" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;">
          ✕
        </button>
      </div>

      <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 21px; margin: 0 0 4px 0; color: #f8fafc; line-height: 1.25;">
        ${room.name}
      </h2>

      <div style="font-size: 13.5px; color: #e2b774; margin-bottom: 10px; font-weight: 500;">
        ✨ ${room.theme}
      </div>

      <p style="font-size: 15px; line-height: 1.55; color: #cbd5e1; margin: 0 0 12px 0;">
        ${room.intro}
      </p>

      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
        <span>🏺 <strong>${STRINGS_VI.exhibitCount(exhibitsCount)}</strong></span>
        <span style="font-style: italic; opacity: 0.8;">Tự đóng sau 6s</span>
      </div>
    `;

    this.container.querySelector('#btn-close-intro')?.addEventListener('click', () => {
      this.hide();
    });

    this.container.style.display = 'block';
    // Trigger transition
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });

    // Tự động mờ dần và biến mất sau đúng 6 giây theo đặc tả F2.1
    this.timerId = window.setTimeout(() => {
      this.hide();
    }, 6000);
  }

  public hide(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(-12px)';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 400);
  }
}
