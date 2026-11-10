import * as THREE from 'three';

export interface DoorOptions {
  targetRoomId: string;
  targetRoomName: string;
  position: THREE.Vector3;
  rotationY?: number;
  width?: number;
  height?: number;
}

/**
 * Lớp đại diện cho Cửa thông phòng 3D có biển tên và cảm biến bước qua (F1.1)
 */
export class Door {
  public readonly group: THREE.Group;
  public readonly targetRoomId: string;
  public readonly targetRoomName: string;
  private readonly triggerRadius = 1.35;
  private readonly worldPosition = new THREE.Vector3();
  private readonly width: number;
  private readonly height: number;

  constructor(options: DoorOptions) {
    this.targetRoomId = options.targetRoomId;
    this.targetRoomName = options.targetRoomName;
    this.width = options.width || 3.0;
    this.height = options.height || 3.8;

    this.group = new THREE.Group();
    this.group.name = `Door_${options.targetRoomId}`;
    this.group.position.copy(options.position);
    if (options.rotationY !== undefined) {
      this.group.rotation.y = options.rotationY;
    }

    this.buildDoorFrame();
    this.buildNamePlaque();
  }

  /**
   * Tạo biển tên bằng đồng mạ vàng phía trên khung cửa
   */
  private buildNamePlaque(): void {
    const plaqueWidth = this.width + 0.6;
    const plaqueHeight = 0.75;

    // Tấm nền kim loại viền nổi
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(plaqueWidth, plaqueHeight, 0.08),
      new THREE.MeshStandardMaterial({
        color: '#1e1b18',
        roughness: 0.35,
        metalness: 0.85,
      })
    );
    frameMesh.position.set(0, this.height + plaqueHeight / 2 - 0.05, 0.04);
    this.group.appendChild(frameMesh);

    // Canvas vẽ chữ tiếng Việt có dấu
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Nền tối và viền đồng sang trọng
    ctx.fillStyle = '#12110e';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 1000, 232);
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 984, 216);

    // Dòng chữ tên phòng
    ctx.font = 'bold 54px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#fef0cd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.targetRoomName.toUpperCase(), 512, 128);

    const canvasTexture = new THREE.CanvasTexture(canvas);
    const textMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(plaqueWidth - 0.1, plaqueHeight - 0.1),
      new THREE.MeshStandardMaterial({
        map: canvasTexture,
        roughness: 0.3,
        metalness: 0.5,
      })
    );
    textMesh.position.set(0, this.height + plaqueHeight / 2 - 0.05, 0.085);
    this.group.appendChild(textMesh);
  }

  /**
   * Dựng khung cửa kiến trúc 3D (hai trụ đứng, xà ngang và ngưỡng cửa)
   */
  private buildDoorFrame(): void {
    const postWidth = 0.35;
    const postDepth = 0.45;

    const frameMat = new THREE.MeshStandardMaterial({
      color: '#2a2622',
      roughness: 0.4,
      metalness: 0.3,
    });

    // Trụ trái
    const leftPost = new THREE.Mesh(
      new THREE.BoxGeometry(postWidth, this.height, postDepth),
      frameMat
    );
    leftPost.position.set(-this.width / 2 - postWidth / 2, this.height / 2, 0);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    this.group.appendChild(leftPost);

    // Trụ phải
    const rightPost = new THREE.Mesh(
      new THREE.BoxGeometry(postWidth, this.height, postDepth),
      frameMat
    );
    rightPost.position.set(this.width / 2 + postWidth / 2, this.height / 2, 0);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;
    this.group.appendChild(rightPost);

    // Xà ngang trên
    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + postWidth * 2 + 0.1, postWidth, postDepth),
      frameMat
    );
    topBeam.position.set(0, this.height + postWidth / 2, 0);
    topBeam.castShadow = true;
    topBeam.receiveShadow = true;
    this.group.appendChild(topBeam);

    // Ngưỡng cửa bằng đồng ánh sáng
    const sillMesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.width, 0.05, postDepth * 1.2),
      new THREE.MeshStandardMaterial({
        color: '#c59b4c',
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    sillMesh.position.set(0, 0.025, 0);
    sillMesh.receiveShadow = true;
    this.group.appendChild(sillMesh);

    // Lớp vòm portal phát quang nhẹ tạo cảm giác chuyển tiếp không gian
    const portalMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      new THREE.MeshBasicMaterial({
        color: '#1a2233',
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
    portalMesh.position.set(0, this.height / 2, 0);
    this.group.appendChild(portalMesh);
  }

  /**
   * Kiểm tra xem người chơi có bước qua vùng cảm ứng của cửa hay không
   */
  public isPlayerTriggering(playerPos: THREE.Vector3): boolean {
    this.group.getWorldPosition(this.worldPosition);
    const distSq =
      Math.pow(playerPos.x - this.worldPosition.x, 2) +
      Math.pow(playerPos.z - this.worldPosition.z, 2);

    return distSq < Math.pow(this.triggerRadius, 2);
  }

  public getObstacleBoxes(): THREE.Box3[] {
    this.group.updateWorldMatrix(true, false);
    const postWidth = 0.35;
    const halfW = this.width / 2;

    const leftBox = new THREE.Box3();
    const rightBox = new THREE.Box3();

    // Hộp va chạm cho 2 trụ cửa để người chơi không đi xuyên qua cột cửa
    const wp = new THREE.Vector3();
    this.group.getWorldPosition(wp);

    // Tính offset theo góc quay của cửa
    const angle = this.group.rotation.y;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const leftOffset = new THREE.Vector3((-halfW - postWidth / 2) * cos, 0, (-halfW - postWidth / 2) * -sin);
    const rightOffset = new THREE.Vector3((halfW + postWidth / 2) * cos, 0, (halfW + postWidth / 2) * -sin);

    const lPos = wp.clone().add(leftOffset);
    const rPos = wp.clone().add(rightOffset);

    leftBox.setFromCenterAndSize(
      new THREE.Vector3(lPos.x, this.height / 2, lPos.z),
      new THREE.Vector3(postWidth + 0.2, this.height, postWidth + 0.2)
    );

    rightBox.setFromCenterAndSize(
      new THREE.Vector3(rPos.x, this.height / 2, rPos.z),
      new THREE.Vector3(postWidth + 0.2, this.height, postWidth + 0.2)
    );

    return [leftBox, rightBox];
  }
}
