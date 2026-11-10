import { ExhibitData } from '../types';
import { STRINGS_VI } from './strings.vi';

/**
 * Nhãn tóm tắt xuất hiện khi người chơi lại gần hiện vật dưới 3 mét (F2.3)
 */
export class ExhibitPrompt {
  private readonly element: HTMLElement;
  private currentExhibit: ExhibitData | null = null;
  private onClickCallback: (exhibit: ExhibitData) => void;

  constructor(onClick: (exhibit: ExhibitData) => void) {
    this.onClickCallback = onClick;

    this.element = document.createElement('div');
    this.element.id = 'exhibit-prompt-hud';
    this.element.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: rgba(14, 18, 26, 0.92);
      border: 1px solid rgba(212, 163, 89, 0.5);
      border-radius: 12px;
      padding: 12px 20px;
      color: #f1f5f9;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      text-align: center;
      max-width: 460px;
      width: calc(100% - 40px);
      cursor: pointer;
    `;
    document.body.appendChild(this.element);

    this.element.addEventListener('click', () => {
      if (this.currentExhibit) {
        this.onClickCallback(this.currentExhibit);
      }
    });
  }

  public show(exhibit: ExhibitData): void {
    this.currentExhibit = exhibit;

    this.element.innerHTML = `
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #d4a359; font-weight: 700; margin-bottom: 2px;">
        ${STRINGS_VI.interactPromptSummary}
      </div>
      <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
        ${exhibit.title}
      </div>
      <div style="font-size: 13.5px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px;">
        ${exhibit.summary}
      </div>
      <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(212, 163, 89, 0.2); border: 1px solid rgba(212, 163, 89, 0.4); padding: 4px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; color: #fef0cd;">
        <span>🔍</span>
        <span>${STRINGS_VI.interactPromptKey}</span>
      </div>
    `;

    this.element.style.pointerEvents = 'auto';
    this.element.style.opacity = '1';
    this.element.style.transform = 'translateX(-50%) translateY(0)';
  }

  public hide(): void {
    if (!this.currentExhibit) return;
    this.currentExhibit = null;
    this.element.style.pointerEvents = 'none';
    this.element.style.opacity = '0';
    this.element.style.transform = 'translateX(-50%) translateY(10px)';
  }

  public getCurrentExhibit(): ExhibitData | null {
    return this.currentExhibit;
  }
}
