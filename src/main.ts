import { Engine } from './core/Engine';
import { CollisionSystem } from './player/CollisionSystem';
import { FirstPersonController } from './player/FirstPersonController';
import { Lobby } from './world/Lobby';
import { WelcomeOverlay } from './ui/WelcomeOverlay';
import { ScreenFader } from './ui/ScreenFader';
import { RoomIntroOverlay } from './ui/RoomIntroOverlay';
import { Minimap } from './ui/Minimap';
import { RoomManager } from './world/RoomManager';
import { ProgressTracker } from './player/ProgressTracker';
import { ProgressHUD } from './ui/ProgressHUD';
import { ExhibitManager } from './world/ExhibitManager';
import { SpeechService } from './guide/SpeechService';
import { SubtitleHUD } from './ui/SubtitleHUD';
import { Guide } from './guide/Guide';
import { ChatDrawer } from './ui/ChatDrawer';
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

    // 6. Khởi tạo bộ điều khiển người chơi góc nhìn thứ nhất (F1.3)
    const controller = new FirstPersonController(engine.camera, canvas, collisionSystem);
    controller.setPosition(0, 8.5, Math.PI);

    // 7. Khởi tạo các thành phần giao diện & chuyển cảnh
    const screenFader = new ScreenFader();
    const introOverlay = new RoomIntroOverlay();

    // 8. Khởi tạo hệ thống theo dõi tiến độ và quản lý hiện vật (F2.2 - F2.5)
    const progressTracker = new ProgressTracker();
    const progressHUD = new ProgressHUD();
    const exhibitManager = new ExhibitManager(progressTracker, progressHUD, controller);

    // 9. Khởi tạo dịch vụ giọng nói, phụ đề và Hướng dẫn viên 3D Anh Minh (F3.1 - F3.4)
    const speechService = new SpeechService();
    const subtitleHUD = new SubtitleHUD(speechService, museumData.museum.guideName);
    const guide = new Guide(
      museumData.museum.guideName,
      speechService,
      subtitleHUD,
      collisionSystem
    );
    engine.scene.add(guide.group);

    // 10. Khởi tạo bộ quản lý phòng (RoomManager)
    const roomManager = new RoomManager(
      engine,
      museumData,
      lobby,
      collisionSystem,
      controller,
      screenFader,
      introOverlay,
      exhibitManager
    );
    roomManager.setGuide(guide);

    // 11. Bản đồ nhỏ ở góc phải trên (F1.5)
    const minimap = new Minimap(museumData.rooms, (targetRoomId) => {
      roomManager.navigateTo(targetRoomId);
    });
    roomManager.setMinimap(minimap);

    // 12. Trợ lý hỏi đáp AI cùng Hướng dẫn viên ảo (F4.1 - F4.6)
    const chatDrawer = new ChatDrawer({
      guideName: museumData.museum.guideName,
      onOpenStateChange: (isOpen) => {
        controller.setEnabled(!isOpen);
      },
      onGuideSpeak: (text) => {
        guide.answerQuestion(text);
      },
      onGetContext: () => {
        const currentRoomId = roomManager.getCurrentRoomId();
        const currentExhibit = exhibitManager.getCurrentExhibit();
        return {
          roomId: currentRoomId === 'lobby' ? undefined : currentRoomId,
          exhibitId: currentExhibit?.id,
        };
      },
    });

    // Cập nhật 3 câu hỏi gợi ý khi đổi phòng
    const defaultLobbyQuestions = [
      'Bảo tàng này trưng bày những gì?',
      'Làm sao để di chuyển giữa các phòng?',
      'Hệ Mặt Trời có bao nhiêu hành tinh?',
    ];
    chatDrawer.setSuggestedQuestions(defaultLobbyQuestions);

    roomManager.addRoomChangeListener((room) => {
      if (room && room.suggestedQuestions && room.suggestedQuestions.length > 0) {
        chatDrawer.setSuggestedQuestions(room.suggestedQuestions);
      } else {
        chatDrawer.setSuggestedQuestions(defaultLobbyQuestions);
      }
    });

    // Nút mở chat trên HUD
    const btnOpenChat = document.getElementById('btn-open-chat');
    btnOpenChat?.addEventListener('click', () => {
      chatDrawer.toggle();
    });

    // Phím tắt T để mở/đóng khung chat
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          chatDrawer.toggle();
        }
      }
    });

    // Đăng ký controller và roomManager vào vòng lặp đồ họa
    engine.addUpdatable((delta) => {
      controller.update(delta);
      roomManager.update(delta);
    });

    // Bắt đầu chạy vòng lặp dựng hình Three.js
    engine.start();

    // 12. Tạo màn hình mở đầu (Welcome & Hướng dẫn điều khiển)
    const welcomeOverlay = new WelcomeOverlay(museumData, () => {
      controller.setEnabled(true);
      canvas.focus();
      // Khi bắt đầu vào sảnh: Hướng dẫn viên vẫy chào và nói lời chào mừng (F3.4)
      guide.greetLobby(museumData.museum.welcome);
    });

    // Hỗ trợ tham số URL thử nghiệm hoặc liên kết trực tiếp (?autostart=1&room=...)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      controller.setEnabled(true);
      welcomeOverlay.hide();
      const targetRoom = urlParams.get('room');
      if (targetRoom) {
        await roomManager.navigateToRoom(targetRoom);

        // Tham số vị trí tùy chọn (?pos=x,z)
        const posParam = urlParams.get('pos');
        if (posParam) {
          const [px, pz] = posParam.split(',').map(Number);
          if (!isNaN(px) && !isNaN(pz)) {
            controller.setPosition(px, pz, Math.PI);
          }
        }

        // Tham số mở ngay chi tiết hiện vật (?openExhibit=id)
        const openExId = urlParams.get('openExhibit');
        if (openExId) {
          const roomData = museumData.rooms.find((r) => r.id === targetRoom);
          const targetExData = roomData?.exhibits?.find((e) => e.id === openExId);
          if (targetExData) {
            setTimeout(() => {
              exhibitManager.openDetailForExhibit(targetExData);
            }, 600);
          }
        }
      } else {
        // Tự động chào ở sảnh nếu không chỉ định phòng
        guide.greetLobby(museumData.museum.welcome);
      }

      // Tham số tự động mở khung chat (?openChat=1)
      if (urlParams.get('openChat') === '1') {
        if (urlParams.get('demoChat') === '1') {
          chatDrawer.addDemoConversation(
            'Mặt Trời to cỡ nào hả anh Minh?',
            'Chào bạn! Mặt Trời là ngôi sao ở trung tâm với đường kính khoảng 1.392.700 km, gấp khoảng 109 lần Trái Đất và chiếm tới 99,86% tổng khối lượng toàn Hệ Mặt Trời! Bạn có muốn tìm hiểu tiếp về nhiệt độ bề mặt của Mặt Trời không?'
          );
        }
        setTimeout(() => {
          chatDrawer.open(true);
        }, 800);
      }
    }

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
