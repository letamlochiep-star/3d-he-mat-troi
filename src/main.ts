import { Engine } from './core/Engine';
import { CollisionSystem } from './player/CollisionSystem';
import { FirstPersonController } from './player/FirstPersonController';
import { Lobby } from './world/Lobby';
import { WelcomeOverlay } from './ui/WelcomeOverlay';
import { loadMuseum, MuseumValidationError } from './types';
import { STRINGS_VI } from './ui/strings.vi';

/**
 * Hiển thị thông báo lỗi khi không thể nạp hoặc dữ liệu thiếu trường
 */
function showFatalError(error: unknown): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(12, 15, 20, 0.95);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    color: #f1f5f9;
  `;

  let msg = 'Đã xảy ra lỗi không xác định.';
  let fieldPath = '';

  if (error instanceof MuseumValidationError) {
    msg = error.message;
    if (error.fieldPath) {
      fieldPath = `Vị trí trường: ${error.fieldPath}`;
    }
  } else if (error instanceof Error) {
    msg = error.message;
  }

  overlay.innerHTML = `
    <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #7f1d1d; border-radius: 12px; padding: 28px; max-width: 600px; width: 100%;">
      <h2 style="color: #fca5a5; margin-bottom: 12px; font-size: 22px;">⚠️ ${STRINGS_VI.errorTitle}</h2>
      <div style="background: rgba(0,0,0,0.4); padding: 14px; border-left: 4px solid #ef4444; margin-bottom: 16px; font-family: monospace; font-size: 15px; color: #fee2e2;">
        ${msg}
      </div>
      ${fieldPath ? `<p style="color: #fca5a5; font-size: 14px; margin-bottom: 14px;"><code>${fieldPath}</code></p>` : ''}
      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Vui lòng kiểm tra lại tệp <code>public/data/museum.json</code>.
      </p>
      <button onclick="location.reload()" style="background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 15px;">
        ${STRINGS_VI.retry}
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Khởi động ứng dụng Bảo tàng ảo 3D
 */
async function bootstrap(): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Không tìm thấy canvas #stage trong DOM.');
  }

  try {
    // 1. Nạp và xác thực toàn bộ dữ liệu từ museum.json
    const museumData = await loadMuseum('/data/museum.json');

    // 2. Cập nhật HUD tiêu đề
    const nameEl = document.getElementById('hud-museum-name');
    const guideEl = document.getElementById('hud-guide-name');
    if (nameEl) nameEl.textContent = museumData.museum.name;
    if (guideEl) guideEl.textContent = `HDV: ${museumData.museum.guideName}`;

    // 3. Khởi tạo Three.js Engine
    const engine = new Engine(canvas);

    // 4. Khởi tạo hệ thống va chạm
    const collisionSystem = new CollisionSystem();

    // 5. Dựng Sảnh chính 3D (Lobby)
    const lobby = new Lobby(museumData, collisionSystem);
    engine.scene.add(lobby.group);

    // 6. Khởi tạo bộ điều khiển người chơi góc nhìn thứ nhất (F1.3)
    const controller = new FirstPersonController(engine.camera, canvas, collisionSystem);

    // Đặt người chơi ở lối vào sảnh (tọa độ Z = 8.5, mắt nhìn hướng về Bắc Z = -11)
    controller.setPosition(0, 8.5, Math.PI);

    // Đăng ký controller vào vòng lặp đồ họa
    engine.addUpdatable((delta) => {
      controller.update(delta);
    });

    // Bắt đầu chạy vòng lặp dựng hình Three.js
    engine.start();

    // 7. Tạo màn hình mở đầu (Welcome & Hướng dẫn điều khiển)
    const welcomeOverlay = new WelcomeOverlay(museumData, () => {
      controller.setEnabled(true);
      canvas.focus();
    });

    // Nút mở lại bảng hướng dẫn trên HUD
    const btnHelp = document.getElementById('btn-show-help');
    btnHelp?.addEventListener('click', () => {
      controller.setEnabled(false);
      welcomeOverlay.show();
    });

    // Phím tắt H để mở hướng dẫn
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && controller.isEnabled()) {
        controller.setEnabled(false);
        welcomeOverlay.show();
      }
    });
  } catch (error) {
    console.error('Lỗi khởi tạo bảo tàng 3D:', error);
    showFatalError(error);
  }
}

// Bắt đầu chạy ngay khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
