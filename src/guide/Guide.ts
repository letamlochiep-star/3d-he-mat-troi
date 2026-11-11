import * as THREE from 'three';
import { ProceduralGuideModel, GuideAnimationState } from './ProceduralGuideModel';
import { SpeechService } from './SpeechService';
import { SubtitleHUD } from '../ui/SubtitleHUD';
import { CollisionSystem } from '../player/CollisionSystem';
import { ExhibitData } from '../types';

/**
 * Lớp điều khiển Hướng dẫn viên 3D (Anh Minh) theo chuẩn F3.1 đến F3.6
 */
export class Guide {
  public readonly group: THREE.Group;
  private readonly proceduralModel: ProceduralGuideModel;
  private readonly speechService: SpeechService;
  private readonly subtitleHUD: SubtitleHUD;
  private readonly collisionSystem: CollisionSystem;

  // Trạng thái AI di chuyển
  private currentPosition = new THREE.Vector3(1.8, 0, 8.5);
  private currentYaw = Math.PI;
  private isSpeaking = false;
  private isGreeting = false;

  // Trạng thái Tour có hướng dẫn & Kể chuyện (Lệnh 6: F3.5, F3.6)
  private isTellingStory = false;
  private isManualWalking = false;
  private walkTargetPos = new THREE.Vector3();
  private walkTargetYaw = Math.PI;
  private onWalkArrival: (() => void) | null = null;

  // Cấu hình cự ly đi theo (2–3 mét theo yêu cầu F3.3)
  private readonly followMinDistance = 1.8;
  private readonly followMaxDistance = 3.0;
  private readonly walkSpeed = 3.2; // mét / giây

  // Lưu vết các phòng đã thuyết minh lời dẫn
  private introducedRooms: Set<string> = new Set();

  constructor(
    guideName: string,
    speechService: SpeechService,
    subtitleHUD: SubtitleHUD,
    collisionSystem: CollisionSystem
  ) {
    this.speechService = speechService;
    this.subtitleHUD = subtitleHUD;
    this.collisionSystem = collisionSystem;

    this.group = new THREE.Group();
    this.group.name = 'TourGuide';

    // Dựng mô hình 3D theo đúng đặc tả F3.1 và F3.2
    this.proceduralModel = new ProceduralGuideModel(guideName);
    this.group.add(this.proceduralModel.group);

    this.group.position.copy(this.currentPosition);
    this.group.rotation.y = this.currentYaw;

    // Lắng nghe trạng thái nói để đồng bộ cử chỉ animation talk
    this.speechService.addListener((isSpeaking) => {
      this.isSpeaking = isSpeaking;
      if (!isSpeaking) {
        if (!this.isGreeting) {
          this.proceduralModel.setAnimation('idle');
        }
      }
    });
  }

  /**
   * Đặt vị trí xuất hiện của Hướng dẫn viên (ví dụ khi mới chuyển phòng)
   */
  public teleportTo(x: number, z: number, yaw = Math.PI): void {
    this.currentPosition.set(x, 0, z);
    this.currentYaw = yaw;
    this.group.position.copy(this.currentPosition);
    this.group.rotation.y = this.currentYaw;
    this.proceduralModel.setAnimation('idle');
  }

  /**
   * Vẫy chào và nói lời chào mừng ở Sảnh chính (F3.4)
   */
  public greetLobby(welcomeText: string): void {
    this.isGreeting = true;
    this.proceduralModel.setAnimation('wave');

    this.subtitleHUD.showText(welcomeText);

    this.speechService.speak(
      welcomeText,
      null,
      () => {
        // Sau 2.5s vẫy chào thì chuyển sang nói chuyện
        setTimeout(() => {
          this.isGreeting = false;
          if (this.isSpeaking) {
            this.proceduralModel.setAnimation('talk');
          }
        }, 2500);
      },
      () => {
        this.isGreeting = false;
        this.proceduralModel.setAnimation('idle');
        this.subtitleHUD.hide();
      }
    );
  }

  /**
   * Nói lời dẫn khi khách bước vào phòng lần đầu (F3.4)
   */
  public introduceRoom(roomId: string, guideIntro: string, audioUrl?: string | null): void {
    if (this.introducedRooms.has(roomId) || !guideIntro.trim()) {
      return;
    }
    this.introducedRooms.add(roomId);

    this.proceduralModel.setAnimation('talk');
    this.subtitleHUD.showText(guideIntro);

    this.speechService.speak(
      guideIntro,
      audioUrl,
      () => {
        this.proceduralModel.setAnimation('talk');
      },
      () => {
        this.proceduralModel.setAnimation('idle');
        this.subtitleHUD.hide();
      }
    );
  }

  /**
   * Trả lời câu hỏi người dùng đặt cho hướng dẫn viên (Lệnh 5: F4.4)
   */
  public answerQuestion(text: string): void {
    this.proceduralModel.setAnimation('talk');
    this.subtitleHUD.showText(text);

    this.speechService.speak(
      text,
      null,
      () => {
        this.proceduralModel.setAnimation('talk');
      },
      () => {
        this.proceduralModel.setAnimation('idle');
        this.subtitleHUD.hide();
      }
    );
  }

  /**
   * Hướng dẫn viên chủ động bước tới vị trí chỉ định trong Tour (F3.5)
   */
  public walkTo(x: number, z: number, targetYaw: number, onArrival?: () => void): void {
    this.isManualWalking = true;
    this.walkTargetPos.set(x, 0, z);
    this.walkTargetYaw = targetYaw;
    this.onWalkArrival = onArrival || null;
    this.proceduralModel.setAnimation('walk');
  }

  /**
   * Kể câu chuyện hiện vật theo từng câu văn (F3.6)
   */
  public tellStory(
    exhibit: ExhibitData,
    onSentence?: (index: number, text: string, total: number) => void,
    onComplete?: () => void
  ): void {
    if (!exhibit.story) {
      onComplete?.();
      return;
    }

    this.isTellingStory = true;
    this.proceduralModel.setAnimation('talk');

    // Tách các câu văn bằng regex
    const rawSentences = exhibit.story.match(/[^.!?]+[.!?]+/g) || [exhibit.story];
    const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);

    this.speechService.speakSentences(
      sentences,
      (idx, sentence, total) => {
        this.proceduralModel.setAnimation('talk');
        this.subtitleHUD.showText(sentence, {
          title: exhibit.title,
          sentenceIndex: idx,
          totalSentences: total,
          onPauseToggle: () => {
            if (this.speechService.isPaused()) {
              this.proceduralModel.setAnimation('idle');
            } else {
              this.proceduralModel.setAnimation('talk');
            }
          },
          onReplay: () => {
            this.proceduralModel.setAnimation('talk');
          },
        });
        onSentence?.(idx, sentence, total);
      },
      () => {
        this.isTellingStory = false;
        this.proceduralModel.setAnimation('idle');
        this.subtitleHUD.hide();
        onComplete?.();
      }
    );
  }

  public pauseStory(): void {
    this.speechService.pause();
    this.proceduralModel.setAnimation('idle');
  }

  public resumeStory(): void {
    this.speechService.resume();
    this.proceduralModel.setAnimation('talk');
  }

  public replayStory(): void {
    this.speechService.replaySentences();
    this.proceduralModel.setAnimation('talk');
  }

  public stopStory(): void {
    this.isTellingStory = false;
    this.isManualWalking = false;
    this.stopSpeaking();
  }

  public isStoryActive(): boolean {
    return this.isTellingStory;
  }

  /**
   * Ngắt lời và dừng hành động nói (khi chuyển phòng)
   */
  public stopSpeaking(): void {
    this.isTellingStory = false;
    this.isManualWalking = false;
    this.speechService.stop();
    this.subtitleHUD.hide();
    this.isSpeaking = false;
    this.isGreeting = false;
    this.proceduralModel.setAnimation('idle');
  }

  /**
   * Cập nhật AI đi theo khách, né tầm nhìn hiện vật và xoay mặt mượt mà (F3.3)
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    closestExhibitPos?: THREE.Vector3 | null
  ): void {
    // 1. Cập nhật chuyển động hoạt hình
    this.proceduralModel.update(delta);

    // 2. Nếu đang tự bước đi tới vị trí chỉ định trong Tour (F3.5)
    if (this.isManualWalking) {
      const dx = this.walkTargetPos.x - this.currentPosition.x;
      const dz = this.walkTargetPos.z - this.currentPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.08) {
        this.proceduralModel.setAnimation('walk');
        const moveDist = Math.min(this.walkSpeed * delta, dist);
        const moveX = (dx / dist) * moveDist;
        const moveZ = (dz / dist) * moveDist;

        this.currentPosition.x += moveX;
        this.currentPosition.z += moveZ;
        this.group.position.x = this.currentPosition.x;
        this.group.position.z = this.currentPosition.z;

        // Xoay hướng mặt theo hướng bước đi
        const targetYaw = Math.atan2(dx, dz);
        this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, delta * 10.0);
      } else {
        // Đã đến đích
        this.isManualWalking = false;
        this.currentPosition.x = this.walkTargetPos.x;
        this.currentPosition.z = this.walkTargetPos.z;
        this.group.position.x = this.currentPosition.x;
        this.group.position.z = this.currentPosition.z;
        this.currentYaw = this.walkTargetYaw;
        this.proceduralModel.setAnimation('idle');

        const cb = this.onWalkArrival;
        this.onWalkArrival = null;
        cb?.();
      }

      this.group.rotation.y = this.currentYaw;
      return;
    }

    // 3. Tính vị trí mục tiêu lý tưởng (cách khách 2–3m)
    // Để không chắn tầm nhìn hiện vật: đứng lệch một góc ~40 độ so với hướng nhìn của khách
    const followAngleOffset = closestExhibitPos ? 0.75 : 0.65; // ~40 độ
    const desiredAngle = playerYaw + followAngleOffset;
    const targetDistance = 2.4; // cự ly lý tưởng 2.4m

    const targetX = playerPos.x + Math.sin(desiredAngle) * targetDistance;
    const targetZ = playerPos.z + Math.cos(desiredAngle) * targetDistance;

    const dx = targetX - this.currentPosition.x;
    const dz = targetZ - this.currentPosition.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);
    const distToPlayer = Math.sqrt(
      Math.pow(playerPos.x - this.currentPosition.x, 2) +
      Math.pow(playerPos.z - this.currentPosition.z, 2)
    );

    // 3. Xử lý di chuyển đi theo khách
    if (distToPlayer > this.followMaxDistance || distToTarget > 0.5) {
      if (!this.isSpeaking && !this.isGreeting) {
        this.proceduralModel.setAnimation('walk');
      }

      // Hướng di chuyển tới điểm mục tiêu
      const moveDist = Math.min(this.walkSpeed * delta, distToTarget);
      const moveX = (dx / (distToTarget || 1)) * moveDist;
      const moveZ = (dz / (distToTarget || 1)) * moveDist;

      const intendedPos = new THREE.Vector3(
        this.currentPosition.x + moveX,
        0,
        this.currentPosition.z + moveZ
      );

      // Chống đi xuyên tường và vật cản bằng CollisionSystem (F1.4, F3.3)
      const resolved = this.collisionSystem.resolvePosition(
        new THREE.Vector3(this.currentPosition.x, 1.0, this.currentPosition.z),
        new THREE.Vector3(intendedPos.x, 1.0, intendedPos.z),
        0.35
      );

      this.currentPosition.x = resolved.x;
      this.currentPosition.z = resolved.z;
      this.group.position.x = this.currentPosition.x;
      this.group.position.z = this.currentPosition.z;

      // Xoay hướng theo hướng bước đi nếu không nói chuyện
      if (!this.isSpeaking && !this.isGreeting) {
        const moveYaw = Math.atan2(moveX, moveZ);
        this.currentYaw = this.lerpAngle(this.currentYaw, moveYaw, delta * 8.0);
      }
    } else {
      // Khi đã đứng trong phạm vi an toàn
      if (!this.isSpeaking && !this.isGreeting) {
        this.proceduralModel.setAnimation('idle');
      }
    }

    // 4. Khi nói hoặc khi đứng gần khách: luôn quay mặt về phía khách (F3.3)
    if (this.isSpeaking || this.isGreeting || distToPlayer <= this.followMaxDistance) {
      const faceDx = playerPos.x - this.currentPosition.x;
      const faceDz = playerPos.z - this.currentPosition.z;
      const faceYaw = Math.atan2(faceDx, faceDz);
      this.currentYaw = this.lerpAngle(this.currentYaw, faceYaw, delta * 6.0);
    }

    this.group.rotation.y = this.currentYaw;
  }

  /**
   * Nội suy góc xoay mượt mà tránh giật góc 360 độ
   */
  private lerpAngle(start: number, end: number, factor: number): number {
    let diff = end - start;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return start + diff * Math.min(1.0, factor);
  }

  public dispose(): void {
    this.stopSpeaking();
    this.group.clear();
  }
}
