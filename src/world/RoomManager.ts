import * as THREE from 'three';
import { MuseumData, RoomData } from '../types';
import { Engine } from '../core/Engine';
import { Lobby } from './Lobby';
import { RoomBuilder, RoomInstance } from './RoomBuilder';
import { CollisionSystem } from '../player/CollisionSystem';
import { FirstPersonController } from '../player/FirstPersonController';
import { ScreenFader } from '../ui/ScreenFader';
import { RoomIntroOverlay } from '../ui/RoomIntroOverlay';
import { Minimap } from '../ui/Minimap';

/**
 * Bộ quản lý chuyển cảnh giữa Sảnh chính và các phòng (F1.1, F1.2, F1.5, F2.1)
 */
export class RoomManager {
  private readonly engine: Engine;
  private readonly museumData: MuseumData;
  private readonly lobby: Lobby;
  private readonly collisionSystem: CollisionSystem;
  private readonly controller: FirstPersonController;
  private readonly screenFader: ScreenFader;
  private readonly introOverlay: RoomIntroOverlay;
  private minimap: Minimap | null = null;

  private currentRoomId = 'lobby';
  private currentRoomInstance: RoomInstance | null = null;
  private isTransitioning = false;
  private lastTriggerTime = 0;

  constructor(
    engine: Engine,
    museumData: MuseumData,
    lobby: Lobby,
    collisionSystem: CollisionSystem,
    controller: FirstPersonController,
    screenFader: ScreenFader,
    introOverlay: RoomIntroOverlay
  ) {
    this.engine = engine;
    this.museumData = museumData;
    this.lobby = lobby;
    this.collisionSystem = collisionSystem;
    this.controller = controller;
    this.screenFader = screenFader;
    this.introOverlay = introOverlay;

    // Đặt sảnh chính là cảnh hiển thị ban đầu
    this.engine.scene.add(this.lobby.group);
  }

  public setMinimap(minimap: Minimap): void {
    this.minimap = minimap;
  }

  public getCurrentRoomId(): string {
    return this.currentRoomId;
  }

  /**
   * Cập nhật và kiểm tra cảm biến bước qua cửa trong từng khung hình
   */
  public update(_delta: number): void {
    if (this.isTransitioning) return;

    // Khoảng đệm thời gian tránh trigger liên tục sau khi vừa chuyển phòng
    const now = performance.now();
    if (now - this.lastTriggerTime < 1500) return;

    const playerPos = this.controller.getPosition();

    // 1. Khi đang ở sảnh chính: kiểm tra các cửa vào phòng
    if (this.currentRoomId === 'lobby') {
      const lobbyDoors = this.lobby.getDoors();
      for (const door of lobbyDoors) {
        if (door.isPlayerTriggering(playerPos)) {
          this.lastTriggerTime = now;
          this.navigateToRoom(door.targetRoomId);
          break;
        }
      }
    } else if (this.currentRoomInstance) {
      // 2. Khi đang ở trong phòng: kiểm tra cửa quay về sảnh chính
      if (this.currentRoomInstance.returnDoor.isPlayerTriggering(playerPos)) {
        this.lastTriggerTime = now;
        this.navigateToLobby();
      }
    }
  }

  /**
   * Chuyển vào một phòng trưng bày cụ thể (F1.1, F1.2)
   */
  public async navigateToRoom(roomId: string): Promise<void> {
    if (this.isTransitioning || this.currentRoomId === roomId) return;
    this.isTransitioning = true;

    const roomData = this.museumData.rooms.find((r) => r.id === roomId);
    if (!roomData) {
      console.error(`Không tìm thấy phòng có mã định danh '${roomId}'`);
      this.isTransitioning = false;
      return;
    }

    await this.screenFader.fadeTransition(() => {
      // 1. Tháo dỡ cảnh hiện tại
      if (this.currentRoomId === 'lobby') {
        this.engine.scene.remove(this.lobby.group);
      } else if (this.currentRoomInstance) {
        this.engine.scene.remove(this.currentRoomInstance.group);
        this.currentRoomInstance.dispose();
        this.currentRoomInstance = null;
      }

      // 2. Dựng phòng mới từ dữ liệu rooms[] (F1.2)
      const newRoom = RoomBuilder.buildRoom(roomData, this.collisionSystem);
      this.currentRoomInstance = newRoom;
      this.engine.scene.add(newRoom.group);

      // 3. Đặt người chơi ở lối vào của phòng mới (nhìn thẳng về phía Bắc)
      const entranceZ = roomData.size.depth / 2 - 2.2;
      this.controller.setPosition(0, entranceZ, Math.PI);

      this.currentRoomId = roomId;

      // 4. Cập nhật minimap & hiển thị bảng giới thiệu 6 giây (F2.1)
      this.minimap?.setCurrentRoom(roomId);
      this.introOverlay.show(roomData);
    });

    this.isTransitioning = false;
  }

  /**
   * Quay trở lại Sảnh chính (Lobby)
   */
  public async navigateToLobby(): Promise<void> {
    if (this.isTransitioning || this.currentRoomId === 'lobby') return;
    this.isTransitioning = true;

    await this.screenFader.fadeTransition(() => {
      // 1. Giải phóng phòng cũ
      if (this.currentRoomInstance) {
        this.engine.scene.remove(this.currentRoomInstance.group);
        this.currentRoomInstance.dispose();
        this.currentRoomInstance = null;
      }

      // 2. Khôi phục ranh giới và vật cản của Sảnh chính
      this.lobby.setupBoundariesAndObstacles();
      this.engine.scene.add(this.lobby.group);

      // 3. Đặt người chơi ở lối vào sảnh (nhìn hướng về bảng tên phía Bắc)
      this.controller.setPosition(0, 8.5, Math.PI);
      this.currentRoomId = 'lobby';

      // 4. Cập nhật Minimap & ẩn bảng giới thiệu
      this.minimap?.setCurrentRoom('lobby');
      this.introOverlay.hide();
    });

    this.isTransitioning = false;
  }

  /**
   * Chuyển đến bất kỳ phòng nào hoặc sảnh chính (Dùng cho bản đồ nhỏ F1.5)
   */
  public navigateTo(targetId: string): void {
    if (targetId === 'lobby') {
      this.navigateToLobby();
    } else {
      this.navigateToRoom(targetId);
    }
  }
}
