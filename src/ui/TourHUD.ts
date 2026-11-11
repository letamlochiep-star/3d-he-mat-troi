import { STRINGS_VI } from './strings.vi';

export interface TourHUDCallbacks {
  onPauseToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReplay: () => void;
  onExit: () => void;
  onToggleReducedMotion?: (enabled: boolean) => void;
}

export class TourHUD {
  private readonly container: HTMLElement;
  private readonly badgeEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly subTitleEl: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly replayBtn: HTMLButtonElement;
  private readonly exitBtn: HTMLButtonElement;
  private readonly toastEl: HTMLElement;

  private isVisible = false;
  private isPaused = false;
  private isReducedMotion = false;
  private callbacks: TourHUDCallbacks;

  constructor(callbacks: TourHUDCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.id = 'tour-hud-bar';
    this.container.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      max-width: 760px;
      width: calc(100% - 24px);
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid rgba(212, 163, 89, 0.45);
      border-radius: 14px;
      padding: 10px 14px;
      color: #f8fafc;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 140;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
    `;

    // Hàng trên: Thông tin điểm dừng & Tiến độ
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    `;

    const infoBox = document.createElement('div');
    infoBox.style.cssText = `display: flex; align-items: center; gap: 10px;`;

    this.badgeEl = document.createElement('span');
    this.badgeEl.style.cssText = `
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #4ade80;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;
    this.badgeEl.innerHTML = `<span>●</span> ${STRINGS_VI.tourBadge}`;

    const textCol = document.createElement('div');
    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `font-size: 15px; font-weight: 700; color: #f1f5f9;`;
    this.titleEl.innerText = 'Đang tải điểm tour...';

    this.subTitleEl = document.createElement('div');
    this.subTitleEl.style.cssText = `font-size: 12.5px; color: #94a3b8;`;
    this.subTitleEl.innerText = '';

    textCol.appendChild(this.titleEl);
    textCol.appendChild(this.subTitleEl);

    infoBox.appendChild(this.badgeEl);
    infoBox.appendChild(textCol);

    // Hàng nút điều khiển
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = `display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`;

    // Nút Quay lại
    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.style.cssText = this.getBtnStyle('#334155', '#94a3b8');
    this.prevBtn.innerHTML = `<span>⏮️</span> <span>${STRINGS_VI.btnPrevTour}</span>`;
    this.prevBtn.onclick = () => this.callbacks.onPrev();

    // Nút Tạm dừng / Tiếp tục
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.type = 'button';
    this.pauseBtn.style.cssText = this.getBtnStyle('rgba(56, 139, 253, 0.25)', '#79c0ff', 'rgba(56, 139, 253, 0.5)');
    this.pauseBtn.innerHTML = `<span>⏸️</span> <span>${STRINGS_VI.btnPauseTour}</span>`;
    this.pauseBtn.onclick = () => this.callbacks.onPauseToggle();

    // Nút Nghe lại
    this.replayBtn = document.createElement('button');
    this.replayBtn.type = 'button';
    this.replayBtn.style.cssText = this.getBtnStyle('rgba(212, 163, 89, 0.2)', '#fef0cd', 'rgba(212, 163, 89, 0.4)');
    this.replayBtn.innerHTML = `<span>🔁</span> <span>${STRINGS_VI.btnReplayStory}</span>`;
    this.replayBtn.onclick = () => this.callbacks.onReplay();

    // Nút Kế tiếp
    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.style.cssText = this.getBtnStyle('#334155', '#94a3b8');
    this.nextBtn.innerHTML = `<span>⏭️</span> <span>${STRINGS_VI.btnNextTour}</span>`;
    this.nextBtn.onclick = () => this.callbacks.onNext();

    // Nút Thoát tour
    this.exitBtn = document.createElement('button');
    this.exitBtn.type = 'button';
    this.exitBtn.style.cssText = this.getBtnStyle('rgba(239, 68, 68, 0.15)', '#fca5a5', 'rgba(239, 68, 68, 0.35)');
    this.exitBtn.innerHTML = `<span>✕</span> <span>${STRINGS_VI.btnExitTour}</span>`;
    this.exitBtn.onclick = () => this.callbacks.onExit();

    btnGroup.appendChild(this.prevBtn);
    btnGroup.appendChild(this.pauseBtn);
    btnGroup.appendChild(this.replayBtn);
    btnGroup.appendChild(this.nextBtn);
    btnGroup.appendChild(this.exitBtn);

    topRow.appendChild(infoBox);
    topRow.appendChild(btnGroup);
    this.container.appendChild(topRow);

    // Toast cảnh báo khi can thiệp di chuyển
    this.toastEl = document.createElement('div');
    this.toastEl.style.cssText = `
      display: none;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fde68a;
      font-size: 12.5px;
      padding: 6px 12px;
      border-radius: 6px;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;
    this.toastEl.innerHTML = `
      <span>⚠️ ${STRINGS_VI.tourAutoPausedHint}</span>
      <button type="button" id="btn-resume-toast" style="background: #f59e0b; color: #000; border: none; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
        Tiếp tục tour
      </button>
    `;
    this.toastEl.querySelector('#btn-resume-toast')?.addEventListener('click', () => {
      this.callbacks.onPauseToggle();
    });
    this.container.appendChild(this.toastEl);

    document.body.appendChild(this.container);

    this.attachShortcuts();
  }

  private getBtnStyle(bg: string, color: string, border = 'rgba(255, 255, 255, 0.15)'): string {
    return `
      background: ${bg};
      border: 1px solid ${border};
      color: ${color};
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    `;
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.pointerEvents = 'auto';
    this.container.style.opacity = '1';
    this.container.style.transform = 'translateX(-50%) translateY(0)';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.pointerEvents = 'none';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateX(-50%) translateY(-20px)';
  }

  public updateStop(current: number, total: number, exhibitName: string, roomName: string): void {
    this.titleEl.innerText = `${STRINGS_VI.tourProgressLabel(current, total)}: ${exhibitName}`;
    this.subTitleEl.innerText = `${roomName}`;
    this.hideAutoPauseToast();
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.badgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
      this.badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      this.badgeEl.style.color = '#fbbf24';
      this.badgeEl.innerHTML = `<span>⏸</span> ${STRINGS_VI.tourPausedBadge}`;
      this.pauseBtn.innerHTML = `<span>▶️</span> <span>${STRINGS_VI.btnResumeTour}</span>`;
      this.pauseBtn.style.background = 'rgba(34, 197, 94, 0.25)';
      this.pauseBtn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
      this.pauseBtn.style.color = '#4ade80';
    } else {
      this.badgeEl.style.background = 'rgba(34, 197, 94, 0.2)';
      this.badgeEl.style.borderColor = 'rgba(34, 197, 94, 0.4)';
      this.badgeEl.style.color = '#4ade80';
      this.badgeEl.innerHTML = `<span>●</span> ${STRINGS_VI.tourBadge}`;
      this.pauseBtn.innerHTML = `<span>⏸️</span> <span>${STRINGS_VI.btnPauseTour}</span>`;
      this.pauseBtn.style.background = 'rgba(56, 139, 253, 0.25)';
      this.pauseBtn.style.borderColor = 'rgba(56, 139, 253, 0.5)';
      this.pauseBtn.style.color = '#79c0ff';
      this.hideAutoPauseToast();
    }
  }

  public showAutoPauseToast(): void {
    this.toastEl.style.display = 'flex';
  }

  public hideAutoPauseToast(): void {
    this.toastEl.style.display = 'none';
  }

  private attachShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyP') {
        e.preventDefault();
        this.callbacks.onPauseToggle();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        this.callbacks.onNext();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        this.callbacks.onPrev();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.callbacks.onReplay();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.callbacks.onExit();
      }
    });
  }
}
