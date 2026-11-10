/**
 * Lớp quản lý hiệu ứng chuyển cảnh mờ dần màn hình (< 1 giây) theo yêu cầu F1.1
 */
export class ScreenFader {
  private readonly element: HTMLElement;
  private isFading = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'screen-fader';
    this.element.style.cssText = `
      position: fixed;
      inset: 0;
      background: #0a0d14;
      opacity: 0;
      pointer-events: none;
      z-index: 500;
      transition: opacity 0.35s ease-in-out;
    `;
    document.body.appendChild(this.element);
  }

  /**
   * Thực hiện chuyển cảnh: Mờ dần sang tối -> Thực thi thao tác đổi cảnh -> Mờ dần trở lại sáng
   */
  public async fadeTransition(changeAction: () => Promise<void> | void): Promise<void> {
    if (this.isFading) return;
    this.isFading = true;
    this.element.style.pointerEvents = 'auto';

    // 1. Mờ dần màn hình sang đen (Fade Out ~350ms)
    this.element.style.opacity = '1';
    await new Promise((resolve) => setTimeout(resolve, 360));

    // 2. Thực hiện tải phòng mới và giải phóng phòng cũ
    try {
      await changeAction();
    } catch (err) {
      console.error('Lỗi trong quá trình chuyển cảnh phòng:', err);
    }

    // Nghỉ nhẹ 50ms cho WebGL nạp xong khung hình đầu tiên
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Mở sáng màn hình trở lại (Fade In ~350ms)
    this.element.style.opacity = '0';
    await new Promise((resolve) => setTimeout(resolve, 360));

    this.element.style.pointerEvents = 'none';
    this.isFading = false;
  }
}
