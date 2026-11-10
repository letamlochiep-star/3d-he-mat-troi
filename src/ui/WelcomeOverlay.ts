import { STRINGS_VI } from './strings.vi';
import { MuseumData } from '../types';

export class WelcomeOverlay {
  private readonly container: HTMLElement;
  private readonly museumData: MuseumData;
  private onStartCallback: () => void;
  private isVisible = true;

  constructor(museumData: MuseumData, onStart: () => void) {
    this.museumData = museumData;
    this.onStartCallback = onStart;

    this.container = document.createElement('div');
    this.container.id = 'welcome-overlay';
    this.render();
    document.body.appendChild(this.container);

    this.attachEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <style>
        #welcome-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 14, 22, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #f1f5f9;
          font-family: 'Be Vietnam Pro', system-ui, sans-serif;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .welcome-card {
          background: #141a24;
          border: 1px solid rgba(212, 163, 89, 0.35);
          border-radius: 16px;
          max-width: 680px;
          width: 100%;
          padding: 32px 28px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        }

        .welcome-header {
          text-align: center;
        }

        .welcome-badge {
          display: inline-block;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #d4a359;
          background: rgba(212, 163, 89, 0.15);
          padding: 4px 14px;
          border-radius: 9999px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .welcome-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(24px, 4vw, 32px);
          color: #f8fafc;
          line-height: 1.25;
          margin: 0 0 10px 0;
        }

        .welcome-desc {
          font-size: 16px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #222b3d;
          border-radius: 12px;
          padding: 20px;
        }

        @media (min-width: 580px) {
          .controls-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .control-col h3 {
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .control-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .control-list li {
          font-size: 16px;
          color: #cbd5e1;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.45;
        }

        .key-badge {
          background: #253147;
          border: 1px solid #3b4d6e;
          border-bottom-width: 2px;
          border-radius: 4px;
          padding: 2px 7px;
          font-family: monospace;
          font-size: 13px;
          color: #f1f5f9;
          white-space: nowrap;
          font-weight: 600;
        }

        .btn-start-container {
          text-align: center;
          margin-top: 8px;
        }

        .btn-start {
          background: linear-gradient(135deg, #d4a359 0%, #b88636 100%);
          color: #141310;
          font-family: inherit;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.05em;
          border: none;
          border-radius: 8px;
          padding: 14px 36px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 6px 18px rgba(184, 134, 54, 0.35);
          width: 100%;
          max-width: 320px;
        }

        .btn-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(184, 134, 54, 0.5);
          filter: brightness(1.08);
        }

        .btn-start:focus-visible {
          outline: 3px solid #fef0cd;
          outline-offset: 3px;
        }

        .keyboard-hint {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 10px;
        }
      </style>

      <div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="welcome-header">
          <div class="welcome-badge">${STRINGS_VI.welcomeBadge}</div>
          <h1 class="welcome-title" id="modal-title">${this.museumData.museum.name}</h1>
          <p class="welcome-desc">${this.museumData.museum.welcome}</p>
        </header>

        <section class="controls-grid">
          <div class="control-col">
            <h3>💻 ${STRINGS_VI.controlsPcHeading}</h3>
            <ul class="control-list">
              <li>
                <span><span class="key-badge">W</span> <span class="key-badge">A</span> <span class="key-badge">S</span> <span class="key-badge">D</span></span>
                <span>Di chuyển tiến, lùi, ngang</span>
              </li>
              <li>
                <span class="key-badge">Shift</span>
                <span>Chạy nhanh</span>
              </li>
              <li>
                <span class="key-badge">Chuột</span>
                <span>Kéo hoặc click màn hình để nhìn</span>
              </li>
              <li>
                <span class="key-badge">Esc</span>
                <span>Nhả chuột / Tạm dừng</span>
              </li>
            </ul>
          </div>

          <div class="control-col">
            <h3>📱 ${STRINGS_VI.controlsMobileHeading}</h3>
            <ul class="control-list">
              <li>
                <span>🕹️</span>
                <span><strong>Cần ảo góc trái dưới:</strong> Di chuyển</span>
              </li>
              <li>
                <span>👆</span>
                <span><strong>Vuốt màn hình bên phải:</strong> Xoay hướng nhìn</span>
              </li>
              <li>
                <span>🛡️</span>
                <span>Hệ thống tự động chống đi xuyên tường và vật cản</span>
              </li>
            </ul>
          </div>
        </section>

        <footer class="btn-start-container">
          <button type="button" class="btn-start" id="btn-start-tour" autofocus>
            ${STRINGS_VI.btnStartTour}
          </button>
          <div class="keyboard-hint">${STRINGS_VI.readyToStart}</div>
        </footer>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const btn = this.container.querySelector('#btn-start-tour') as HTMLButtonElement | null;
    if (btn) {
      btn.addEventListener('click', () => {
        this.hide();
        this.onStartCallback();
      });
    }

    // Bàn phím hỗ trợ Enter hoặc Space khi mở modal
    window.addEventListener('keydown', (e) => {
      if (this.isVisible && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        this.hide();
        this.onStartCallback();
      }
    });
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'flex';
    const btn = this.container.querySelector('#btn-start-tour') as HTMLButtonElement | null;
    btn?.focus();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }
}
