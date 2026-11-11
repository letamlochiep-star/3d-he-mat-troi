import * as THREE from 'three';
import { Exhibit } from './Exhibit';
import { ExhibitData } from '../types';
import { ExhibitPrompt } from '../ui/ExhibitPrompt';
import { ExhibitDetailModal } from '../ui/ExhibitDetailModal';
import { ProgressTracker } from '../player/ProgressTracker';
import { ProgressHUD } from '../ui/ProgressHUD';
import { FirstPersonController } from '../player/FirstPersonController';

/**
 * Bộ quản trị danh sách hiện vật trong phòng hiện tại (F2.2 - F2.5)
 */
export class ExhibitManager {
  private exhibits: Exhibit[] = [];
  private currentRoomExhibitsData: ExhibitData[] = [];
  private readonly prompt: ExhibitPrompt;
  private readonly detailModal: ExhibitDetailModal;
  private readonly progressTracker: ProgressTracker;
  private readonly progressHUD: ProgressHUD;
  private readonly controller: FirstPersonController;

  private closestExhibit: Exhibit | null = null;
  private readonly interactDistance = 3.2; // Phạm vi 3 mét theo yêu cầu F2.3
  private onListenStoryListener: ((exhibit: ExhibitData) => void) | null = null;

  constructor(
    progressTracker: ProgressTracker,
    progressHUD: ProgressHUD,
    controller: FirstPersonController
  ) {
    this.progressTracker = progressTracker;
    this.progressHUD = progressHUD;
    this.controller = controller;

    // Khởi tạo nhãn tóm tắt khi lại gần
    this.prompt = new ExhibitPrompt((exhibitData) => {
      this.openDetailForExhibit(exhibitData);
    });

    // Khởi tạo bảng chi tiết hiện vật
    this.detailModal = new ExhibitDetailModal(
      () => {
        // Khi đóng modal: cho phép người chơi di chuyển tiếp
        this.controller.setEnabled(true);
      },
      (exhibit) => {
        this.onListenStoryListener?.(exhibit);
      }
    );

    // Lắng nghe phím E để tương tác mở bảng chi tiết
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && this.closestExhibit && this.controller.isEnabled()) {
        this.openDetailForExhibit(this.closestExhibit.data);
      }
    });

    // Lắng nghe thay đổi tiến độ để cập nhật HUD
    this.progressTracker.addListener(() => {
      this.updateProgressHUD();
    });
  }

  public setOnListenStory(listener: (exhibit: ExhibitData) => void): void {
    this.onListenStoryListener = listener;
  }

  public setExhibits(exhibits: Exhibit[], dataList: ExhibitData[]): void {
    this.clearExhibits();
    this.exhibits = exhibits;
    this.currentRoomExhibitsData = dataList;
    this.updateProgressHUD();
    this.progressHUD.setVisible(dataList.length > 0);
  }

  public clearExhibits(): void {
    this.prompt.hide();
    this.closestExhibit = null;
    this.exhibits.forEach((e) => e.dispose());
    this.exhibits = [];
    this.currentRoomExhibitsData = [];
    this.progressHUD.setVisible(false);
  }

  public update(delta: number, playerPos: THREE.Vector3): void {
    if (this.exhibits.length === 0) return;

    let minDistance = Infinity;
    let nearest: Exhibit | null = null;

    for (const exhibit of this.exhibits) {
      exhibit.update(delta);

      const dist = exhibit.getDistance(playerPos);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = exhibit;
      }
    }

    // Kiểm tra khoảng cách dưới 3m (F2.3) - ẩn khi đang ở chế độ Tour (F3.5)
    if (nearest && minDistance <= this.interactDistance && !this.controller.getIsTourMode()) {
      if (this.closestExhibit !== nearest) {
        this.closestExhibit = nearest;
        this.prompt.show(nearest.data);
      }
    } else {
      if (this.closestExhibit !== null) {
        this.closestExhibit = null;
        this.prompt.hide();
      }
    }
  }

  public openDetailForExhibit(exhibitData: ExhibitData): void {
    // 1. Tạm dừng di chuyển góc nhìn thứ nhất
    this.controller.setEnabled(false);

    // 2. Tìm instance để tạo preview 3D tương tác
    const targetExhibit = this.exhibits.find((e) => e.data.id === exhibitData.id);

    // 3. Mở modal chi tiết (F2.3 & F2.4)
    this.detailModal.open(exhibitData, () => {
      if (targetExhibit) {
        return targetExhibit.createPreviewClone();
      }
      return new THREE.Group();
    });

    // 4. Đánh dấu đã xem và lưu bền vững vào localStorage (F2.5)
    this.progressTracker.markAsViewed(exhibitData.id);
  }

  public getClosestExhibit(): Exhibit | null {
    return this.closestExhibit;
  }

  public getCurrentExhibit(): ExhibitData | null {
    return this.closestExhibit ? this.closestExhibit.data : null;
  }

  public getClosestExhibitPosition(): THREE.Vector3 | null {
    return this.closestExhibit ? this.closestExhibit.centerPosition : null;
  }

  private updateProgressHUD(): void {
    if (this.currentRoomExhibitsData.length === 0) {
      this.progressHUD.setVisible(false);
      return;
    }
    const ids = this.currentRoomExhibitsData.map((e) => e.id);
    const { viewed, total } = this.progressTracker.getRoomProgress(ids);
    this.progressHUD.updateProgress(viewed, total);
  }
}
