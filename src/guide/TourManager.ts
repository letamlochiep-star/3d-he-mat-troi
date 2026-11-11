import * as THREE from 'three';
import { MuseumData, RoomData, ExhibitData } from '../types';
import { RoomManager } from '../world/RoomManager';
import { FirstPersonController } from '../player/FirstPersonController';
import { Guide } from './Guide';
import { TourHUD } from '../ui/TourHUD';
import { STRINGS_VI } from '../ui/strings.vi';

export interface TourStop {
  index: number;
  roomId: string;
  roomName: string;
  exhibit: ExhibitData;
  playerPos: THREE.Vector3;
  playerYaw: number;
  guidePos: THREE.Vector3;
  guideYaw: number;
}

/**
 * Bộ quản trị chế độ Tour có hướng dẫn (F3.5 & F3.6)
 */
export class TourManager {
  private readonly museumData: MuseumData;
  private readonly roomManager: RoomManager;
  private readonly controller: FirstPersonController;
  private readonly guide: Guide;
  private readonly tourHUD: TourHUD;

  private stops: TourStop[] = [];
  private currentStopIndex = -1;
  private isTourActive = false;
  private isTourPaused = false;
  private autoAdvanceTimer: number | null = null;

  constructor(
    museumData: MuseumData,
    roomManager: RoomManager,
    controller: FirstPersonController,
    guide: Guide
  ) {
    this.museumData = museumData;
    this.roomManager = roomManager;
    this.controller = controller;
    this.guide = guide;

    // Khởi tạo thanh điều khiển TourHUD
    this.tourHUD = new TourHUD({
      onPauseToggle: () => this.togglePause(),
      onNext: () => this.nextStop(),
      onPrev: () => this.prevStop(),
      onReplay: () => this.replayCurrentStory(),
      onExit: () => this.exitTour(),
      onToggleReducedMotion: (enabled) => this.controller.setReducedMotion(enabled),
    });

    this.buildTourStops();
  }

  /**
   * Xây dựng danh sách điểm dừng tuần tự theo thứ tự phòng và tourOrder trong museum.json
   */
  private buildTourStops(): void {
    this.stops = [];
    let globalIndex = 0;

    for (const room of this.museumData.rooms) {
      if (!room.exhibits || room.exhibits.length === 0) continue;

      // Sắp xếp các hiện vật theo thứ tự tourOrder tăng dần
      const sortedExhibits = [...room.exhibits].sort((a, b) => {
        const orderA = a.tourOrder !== undefined ? a.tourOrder : 999;
        const orderB = b.tourOrder !== undefined ? b.tourOrder : 999;
        return orderA - orderB;
      });

      for (const exhibit of sortedExhibits) {
        let exX = 0;
        let exZ = 0;
        const pos = exhibit.position as any;
        if (Array.isArray(pos)) {
          exX = pos[0] || 0;
          exZ = pos[2] || 0;
        } else if (pos && typeof pos === 'object') {
          exX = Number(pos.x) || 0;
          exZ = Number(pos.z) || 0;
        }

        // Tính vị trí đứng của khách (cách hiện vật 2.6m theo trục Z hoặc hướng nhìn)
        // Nếu hiện vật nằm lệch, quay góc nhìn hướng thẳng vào tâm hiện vật
        const pX = exX;
        const pZ = exZ + 2.6;
        const pYaw = Math.PI; // Hướng về phía Bắc nhìn vào hiện vật

        // Vị trí hướng dẫn viên đứng bên cạnh hiện vật (lệch sang phải 1.6m, cách 1.4m)
        const gX = exX + 1.5;
        const gZ = exZ + 1.4;
        const gYaw = Math.PI + 0.4; // Góc vừa nhìn hiện vật vừa hướng về khách

        this.stops.push({
          index: globalIndex++,
          roomId: room.id,
          roomName: room.name,
          exhibit,
          playerPos: new THREE.Vector3(pX, 1.65, pZ),
          playerYaw: pYaw,
          guidePos: new THREE.Vector3(gX, 0, gZ),
          guideYaw: gYaw,
        });
      }
    }
  }

  public getStopsCount(): number {
    return this.stops.length;
  }

  public getIsActive(): boolean {
    return this.isTourActive;
  }

  public getIsPaused(): boolean {
    return this.isTourPaused;
  }

  /**
   * Bắt đầu chuyến tham quan có hướng dẫn (F3.5)
   */
  public async startTour(startIndex = 0): Promise<void> {
    if (this.stops.length === 0) return;

    this.isTourActive = true;
    this.isTourPaused = false;
    this.currentStopIndex = Math.max(0, Math.min(this.stops.length - 1, startIndex));

    // Kích hoạt chế độ Tour trong controller và lắng nghe can thiệp phím
    this.controller.setTourMode(true, () => {
      this.handlePlayerMoveInterference();
    });

    this.tourHUD.show();
    this.tourHUD.setPaused(false);

    await this.goToStop(this.currentStopIndex);
  }

  /**
   * Tạm dừng hoặc tiếp tục tour
   */
  public togglePause(): void {
    if (!this.isTourActive) return;

    if (this.isTourPaused) {
      this.resumeTour();
    } else {
      this.pauseTour(false);
    }
  }

  public pauseTour(isAutoPause = false): void {
    this.isTourPaused = true;
    this.clearAutoAdvanceTimer();
    this.guide.pauseStory();
    this.controller.stopTransition();
    this.tourHUD.setPaused(true);

    if (isAutoPause) {
      this.tourHUD.showAutoPauseToast();
    }
  }

  public resumeTour(): void {
    this.isTourPaused = false;
    this.tourHUD.setPaused(false);

    if (this.guide.isStoryActive()) {
      this.guide.resumeStory();
    } else {
      // Nếu đang dở việc di chuyển, tiếp tục di chuyển lại điểm hiện tại
      this.goToStop(this.currentStopIndex);
    }
  }

  /**
   * Khi người chơi chạm phím di chuyển: Tour tạm dừng nhường quyền tự do (F3.5)
   */
  private handlePlayerMoveInterference(): void {
    if (!this.isTourActive || this.isTourPaused) return;
    this.pauseTour(true);
  }

  /**
   * Sang điểm dừng tiếp theo
   */
  public async nextStop(): Promise<void> {
    if (!this.isTourActive) return;
    this.clearAutoAdvanceTimer();
    this.guide.stopStory();

    if (this.currentStopIndex < this.stops.length - 1) {
      this.currentStopIndex++;
      await this.goToStop(this.currentStopIndex);
    } else {
      // Đã hoàn thành toàn bộ tour
      this.finishTour();
    }
  }

  /**
   * Quay lại điểm dừng trước đó
   */
  public async prevStop(): Promise<void> {
    if (!this.isTourActive) return;
    this.clearAutoAdvanceTimer();
    this.guide.stopStory();

    if (this.currentStopIndex > 0) {
      this.currentStopIndex--;
      await this.goToStop(this.currentStopIndex);
    }
  }

  /**
   * Nghe lại câu chuyện của điểm dừng hiện tại
   */
  public replayCurrentStory(): void {
    if (!this.isTourActive || this.currentStopIndex < 0) return;
    this.clearAutoAdvanceTimer();

    const stop = this.stops[this.currentStopIndex];
    if (stop && stop.exhibit.story) {
      this.guide.tellStory(
        stop.exhibit,
        undefined,
        () => this.onStoryComplete()
      );
    }
  }

  /**
   * Điều phối di chuyển và kể chuyện tại một điểm dừng
   */
  private async goToStop(index: number): Promise<void> {
    const stop = this.stops[index];
    if (!stop) return;

    this.clearAutoAdvanceTimer();
    this.tourHUD.updateStop(index + 1, this.stops.length, stop.exhibit.title, stop.roomName);

    // 1. Nếu điểm dừng thuộc phòng khác: Chuyển phòng qua RoomManager
    if (this.roomManager.getCurrentRoomId() !== stop.roomId) {
      this.guide.stopSpeaking();
      await this.roomManager.navigateToRoom(stop.roomId);
      // Đợi chuyển cảnh hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!this.isTourActive || this.isTourPaused) return;

    // 2. Hướng dẫn viên bước đi trước theo tour (F3.5)
    this.guide.walkTo(stop.guidePos.x, stop.guidePos.z, stop.guideYaw);

    // 3. Camera của khách lướt đi theo mượt mà
    const isReducedMotion = this.controller.isReducedMotion();
    const moveDuration = isReducedMotion ? 0 : 2.2;

    this.controller.smoothMoveTo(stop.playerPos, stop.playerYaw, moveDuration, () => {
      if (!this.isTourActive || this.isTourPaused) return;

      // 4. Khi đến nơi: Hướng dẫn viên bắt đầu kể câu chuyện hiện vật (F3.6)
      if (stop.exhibit.story) {
        this.guide.tellStory(
          stop.exhibit,
          undefined,
          () => this.onStoryComplete()
        );
      } else {
        // Nếu không có câu chuyện, chờ 3 giây rồi sang điểm tiếp
        this.scheduleAutoAdvance(3000);
      }
    });
  }

  /**
   * Xử lý sau khi nghe xong câu chuyện tại một hiện vật
   */
  private onStoryComplete(): void {
    if (!this.isTourActive || this.isTourPaused) return;
    // Chờ 2.5 giây cho khách quan sát rồi tự động mời sang hiện vật kế
    this.scheduleAutoAdvance(2500);
  }

  private scheduleAutoAdvance(delayMs: number): void {
    this.clearAutoAdvanceTimer();
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.autoAdvanceTimer = null;
      if (this.isTourActive && !this.isTourPaused) {
        this.nextStop();
      }
    }, delayMs);
  }

  private clearAutoAdvanceTimer(): void {
    if (this.autoAdvanceTimer !== null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  /**
   * Kết thúc tour thành công sau khi duyệt hết mọi hiện vật
   */
  private finishTour(): void {
    this.exitTour();

    // Hiển thị hộp thoại chúc mừng hoàn thành tour
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(12, 15, 20, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #141923; border: 1px solid #d4a359; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <div style="font-size: 54px; margin-bottom: 16px;">🏆</div>
        <h2 style="color: #d4a359; font-size: 24px; font-weight: 700; margin-bottom: 12px;">
          ${STRINGS_VI.tourCompletedTitle}
        </h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${STRINGS_VI.tourCompletedDesc}
        </p>
        <button type="button" id="btn-finish-lobby" style="background: linear-gradient(135deg, #d4a359 0%, #b8860b 100%); color: #0c0f14; border: none; font-family: inherit; font-size: 16px; font-weight: 700; padding: 12px 28px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
          ${STRINGS_VI.btnBackToLobby}
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-finish-lobby')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.roomManager.navigateToLobby();
    });
  }

  /**
   * Thoát chế độ tour và trả lại quyền tự do cho khách
   */
  public exitTour(): void {
    this.isTourActive = false;
    this.isTourPaused = false;
    this.clearAutoAdvanceTimer();
    this.guide.stopStory();
    this.controller.setTourMode(false);
    this.tourHUD.hide();
  }
}
