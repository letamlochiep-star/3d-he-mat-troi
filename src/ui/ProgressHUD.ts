import { STRINGS_VI } from './strings.vi';

/**
 * Hiển thị tiến độ tham quan "Đã xem x/y hiện vật" của phòng hiện tại (F2.5)
 */
export class ProgressHUD {
  private readonly element: HTMLElement;
  private viewed = 0;
  private total = 0;
  private isVisible = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'progress-hud';
    this.element.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(15, 20, 30, 0.85);
      border: 1px solid rgba(212, 163, 89, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 20px;
      padding: 6px 16px;
      color: #f1f5f9;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      display: none;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 90;
      pointer-events: none;
    `;
    document.body.appendChild(this.element);
  }

  public updateProgress(viewed: number, total: number): void {
    this.viewed = viewed;
    this.total = total;
    this.render();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.element.style.display = visible && this.total > 0 ? 'inline-flex' : 'none';
  }

  private render(): void {
    const isCompleted = this.viewed === this.total && this.total > 0;
    const progressColor = isCompleted ? '#4ade80' : '#d4a359';

    this.element.innerHTML = `
      <span>🏺</span>
      <span>${STRINGS_VI.exhibitsViewedProgress(this.viewed, this.total)}</span>
      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${progressColor};"></span>
    `;

    this.element.style.display = this.isVisible && this.total > 0 ? 'inline-flex' : 'none';
  }
}
