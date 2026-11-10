import * as THREE from 'three';

export interface RoomBoundaries {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Hệ thống kiểm tra và xử lý va chạm (F1.4)
 * Ngăn người chơi đi xuyên tường và vật cản, hỗ trợ trượt tự nhiên dọc theo bề mặt va chạm
 */
export class CollisionSystem {
  private bounds: RoomBoundaries = {
    minX: -12.5,
    maxX: 12.5,
    minZ: -10.5,
    maxZ: 10.5,
  };

  private obstacles: THREE.Box3[] = [];

  constructor(bounds?: RoomBoundaries) {
    if (bounds) {
      this.bounds = bounds;
    }
  }

  public setBounds(bounds: RoomBoundaries): void {
    this.bounds = bounds;
  }

  public getBounds(): RoomBoundaries {
    return this.bounds;
  }

  public addObstacle(box: THREE.Box3): void {
    this.obstacles.push(box);
  }

  public addObstacleMesh(mesh: THREE.Mesh): void {
    mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) {
      const box = new THREE.Box3();
      box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      this.obstacles.push(box);
    }
  }

  public clearObstacles(): void {
    this.obstacles = [];
  }

  /**
   * Kiểm tra một điểm (kèm bán kính người chơi) có va chạm với vật thể nào không
   */
  private checkCollision(x: number, z: number, radius: number): boolean {
    // 1. Kiểm tra tường bao phòng
    if (
      x - radius < this.bounds.minX ||
      x + radius > this.bounds.maxX ||
      z - radius < this.bounds.minZ ||
      z + radius > this.bounds.maxZ
    ) {
      return true;
    }

    // 2. Kiểm tra các vật cản bên trong
    const playerBox = new THREE.Box3(
      new THREE.Vector3(x - radius, 0, z - radius),
      new THREE.Vector3(x + radius, 2.0, z + radius)
    );

    for (const obstacle of this.obstacles) {
      if (playerBox.intersectsBox(obstacle)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Xử lý di chuyển và giải quyết va chạm theo từng trục (X và Z riêng biệt)
   * Giúp người chơi trượt nhẹ nhàng khi đi chạm góc hoặc tường nghiêng
   */
  public resolvePosition(
    currentPos: THREE.Vector3,
    intendedPos: THREE.Vector3,
    playerRadius = 0.4
  ): THREE.Vector3 {
    const finalPos = currentPos.clone();

    // Thử di chuyển theo trục X
    if (!this.checkCollision(intendedPos.x, currentPos.z, playerRadius)) {
      finalPos.x = intendedPos.x;
    } else {
      // Nếu va chạm với tường biên X, áp sát mép an toàn
      if (intendedPos.x - playerRadius < this.bounds.minX) {
        finalPos.x = this.bounds.minX + playerRadius;
      } else if (intendedPos.x + playerRadius > this.bounds.maxX) {
        finalPos.x = this.bounds.maxX - playerRadius;
      }
    }

    // Thử di chuyển theo trục Z
    if (!this.checkCollision(finalPos.x, intendedPos.z, playerRadius)) {
      finalPos.z = intendedPos.z;
    } else {
      // Nếu va chạm với tường biên Z, áp sát mép an toàn
      if (intendedPos.z - playerRadius < this.bounds.minZ) {
        finalPos.z = this.bounds.minZ + playerRadius;
      } else if (intendedPos.z + playerRadius > this.bounds.maxZ) {
        finalPos.z = this.bounds.maxZ - playerRadius;
      }
    }

    // Chiều cao mắt luôn cố định ở 1.65m theo yêu cầu
    finalPos.y = currentPos.y;

    return finalPos;
  }
}
