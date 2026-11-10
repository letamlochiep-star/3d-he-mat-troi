import * as THREE from 'three';
import { CollisionSystem } from '../player/CollisionSystem';
import { MuseumData } from '../types';
import { Door } from './Door';

export class Lobby {
  public readonly group: THREE.Group;
  private readonly museumData: MuseumData;
  private readonly collisionSystem: CollisionSystem;
  private readonly doors: Door[] = [];
  private readonly obstacleBoxes: THREE.Box3[] = [];

  // Kích thước sảnh chính
  public readonly width = 26;
  public readonly depth = 22;
  public readonly height = 7;

  constructor(museumData: MuseumData, collisionSystem: CollisionSystem) {
    this.museumData = museumData;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();
    this.group.name = 'Lobby';

    this.buildLobbyArchitecture();
    this.setupRoomDoors();
    this.setupLighting();
    this.setupBoundariesAndObstacles();
  }

  public getDoors(): Door[] {
    return this.doors;
  }

  /**
   * Tạo chất liệu sàn đá hoa cương cao cấp bằng Procedural Texture
   */
  private createMarbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Nền đá cẩm thạch sáng
    ctx.fillStyle = '#f3f1ec';
    ctx.fillRect(0, 0, 1024, 1024);

    // Kẻ các đường ron gạch đá lớn 4x4 (mỗi viên gạch 256px)
    ctx.strokeStyle = '#dedad2';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 1024; i += 256) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Vẽ vân đá tự nhiên tinh tế
    ctx.strokeStyle = 'rgba(180, 170, 155, 0.25)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 35; k++) {
      ctx.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 180;
        y += (Math.random() - 0.5) * 180;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6.5, 5.5);
    return texture;
  }

  /**
   * Tạo bảng tên bảo tàng bằng chữ nổi trên tường đối diện lối vào
   */
  private createEmbossedNameBoard(): THREE.Group {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 4.3, -this.depth / 2 + 0.15);

    const boardWidth = 14;
    const boardHeight = 2.4;

    // 1. Tấm phù điêu nền bằng đồng sẫm và khung viền nổi
    const frameGeo = new THREE.BoxGeometry(boardWidth, boardHeight, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#1a1815',
      roughness: 0.35,
      metalness: 0.8,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.castShadow = true;
    boardGroup.appendChild(frameMesh);

    // Viền kim loại mạ vàng
    const borderGeo = new THREE.BoxGeometry(boardWidth + 0.2, boardHeight + 0.2, 0.08);
    const borderMat = new THREE.MeshStandardMaterial({
      color: '#c59b4c',
      roughness: 0.2,
      metalness: 0.9,
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.z = -0.02;
    boardGroup.appendChild(borderMesh);

    // 2. Mặt chữ nổi vẽ trên canvas độ phân giải cao kết hợp hiệu ứng nổi (Emboss/Bevel)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Nền tối thanh lịch
    ctx.fillStyle = '#141310';
    ctx.fillRect(0, 0, 2048, 512);

    // Họa tiết viền chỉ vàng
    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 2008, 472);
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 1984, 448);

    // Dòng phụ đề
    ctx.font = '600 36px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#bfa175';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('KHÔNG GIAN DI SẢN VĂN HÓA SỐ HÓA', 1024, 130);

    // Tên bảo tàng đọc trực tiếp từ dữ liệu museum.json (Chữ nổi mạ vàng)
    const museumName = (this.museumData.museum.name || 'BẢO TÀNG ẢO 3D').toUpperCase();

    // Bóng đổ cho hiệu ứng chữ nổi
    ctx.font = 'bold 88px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#3a2707';
    ctx.fillText(museumName, 1024 + 4, 270 + 5);

    // Lớp kim loại ánh vàng
    const grad = ctx.createLinearGradient(0, 200, 0, 300);
    grad.addColorStop(0, '#fef0cd');
    grad.addColorStop(0.5, '#e4b363');
    grad.addColorStop(1, '#a17226');
    ctx.fillStyle = grad;
    ctx.fillText(museumName, 1024, 270);

    // Dòng giới thiệu nhỏ bên dưới
    ctx.font = 'italic 34px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#d2c7b5';
    ctx.fillText(`Hướng dẫn viên đồng hành: ${this.museumData.museum.guideName}`, 1024, 380);

    const canvasTex = new THREE.CanvasTexture(canvas);
    const textGeo = new THREE.PlaneGeometry(boardWidth - 0.4, boardHeight - 0.4);
    const textMat = new THREE.MeshStandardMaterial({
      map: canvasTex,
      roughness: 0.3,
      metalness: 0.4,
    });
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.z = 0.07;
    boardGroup.appendChild(textMesh);

    return boardGroup;
  }

  /**
   * Tạo mỗi phòng một cửa có biển tên trong Sảnh chính (F1.1)
   */
  private setupRoomDoors(): void {
    const halfW = this.width / 2;
    const rooms = this.museumData.rooms;

    rooms.forEach((room, index) => {
      // Phân bổ cửa đều đặn sang hai bên tường Tây (bên trái) và Đông (bên phải)
      const isWest = index % 2 === 0;
      const pairIndex = Math.floor(index / 2);

      // Khoảng cách Z giữa các cửa
      const zOffset = -5 + pairIndex * 6.5;

      const posX = isWest ? -halfW + 0.15 : halfW - 0.15;
      const rotY = isWest ? Math.PI / 2 : -Math.PI / 2;

      const door = new Door({
        targetRoomId: room.id,
        targetRoomName: room.name,
        position: new THREE.Vector3(posX, 0, zOffset),
        rotationY: rotY,
        width: 2.8,
        height: 3.4,
      });

      this.doors.push(door);
      this.group.appendChild(door.group);

      // Thêm các cột của khung cửa vào danh sách vật cản
      door.getObstacleBoxes().forEach((box) => {
        this.obstacleBoxes.push(box);
      });
    });
  }

  /**
   * Xây dựng kết cấu kiến trúc sảnh 3D: Sàn đá, tường sáng, trần 7m, các cột và bệ
   */
  private buildLobbyArchitecture(): void {
    const halfW = this.width / 2;
    const halfD = this.depth / 2;

    // 1. SÀN ĐÁ
    const floorGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createMarbleTexture(),
      roughness: 0.2, // Độ bóng phản xạ ánh sáng ấm
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.group.appendChild(floor);

    // 2. TRẦN CAO 7M
    const ceilingGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#f5f2eb',
      roughness: 0.8,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = this.height;
    this.group.appendChild(ceiling);

    // Các ô giếng trời / đèn âm trần kiến trúc
    for (let gx = -6; gx <= 6; gx += 6) {
      for (let gz = -4; gz <= 4; gz += 4) {
        const skylightGeo = new THREE.BoxGeometry(3.6, 0.1, 2.4);
        const skylightMat = new THREE.MeshBasicMaterial({ color: '#fffbf0' });
        const skylight = new THREE.Mesh(skylightGeo, skylightMat);
        skylight.position.set(gx, this.height - 0.05, gz);
        this.group.appendChild(skylight);
      }
    }

    // 3. CÁC BỨC TƯỜNG SÁNG (Màu ngà/ivory trang nhã)
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#eae6de',
      roughness: 0.75,
      metalness: 0.02,
    });

    // Tường Bắc (đối diện lối vào)
    const northWallGeo = new THREE.PlaneGeometry(this.width, this.height);
    const northWall = new THREE.Mesh(northWallGeo, wallMat);
    northWall.position.set(0, this.height / 2, -halfD);
    northWall.receiveShadow = true;
    this.group.appendChild(northWall);

    // Tường Nam (phía sau lối vào)
    const southWallGeo = new THREE.PlaneGeometry(this.width, this.height);
    const southWall = new THREE.Mesh(southWallGeo, wallMat);
    southWall.position.set(0, this.height / 2, halfD);
    southWall.rotation.y = Math.PI;
    southWall.receiveShadow = true;
    this.group.appendChild(southWall);

    // Tường Đông (bên phải)
    const eastWallGeo = new THREE.PlaneGeometry(this.depth, this.height);
    const eastWall = new THREE.Mesh(eastWallGeo, wallMat);
    eastWall.position.set(halfW, this.height / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.receiveShadow = true;
    this.group.appendChild(eastWall);

    // Tường Tây (bên trái)
    const westWallGeo = new THREE.PlaneGeometry(this.depth, this.height);
    const westWall = new THREE.Mesh(westWallGeo, wallMat);
    westWall.position.set(-halfW, this.height / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    westWall.receiveShadow = true;
    this.group.appendChild(westWall);

    // Len chân tường (Skirting boards)
    const skirtingMat = new THREE.MeshStandardMaterial({
      color: '#2b2722',
      roughness: 0.4,
      metalness: 0.3,
    });
    const addSkirting = (w: number, d: number, px: number, pz: number) => {
      const sMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), skirtingMat);
      sMesh.position.set(px, 0.125, pz);
      this.group.appendChild(sMesh);
    };
    addSkirting(this.width, 0.1, 0, -halfD + 0.05);
    addSkirting(this.width, 0.1, 0, halfD - 0.05);
    addSkirting(0.1, this.depth, halfW - 0.05, 0);
    addSkirting(0.1, this.depth, -halfW + 0.05, 0);

    // 4. BẢNG TÊN BẢO TÀNG CHỮ NỔI TRÊN TƯỜNG BẮC
    const nameBoard = this.createEmbossedNameBoard();
    this.group.appendChild(nameBoard);

    // 5. CÁC CỘT ĐÁ KIẾN TRÚC TRONG SẢNH (4 CỘT)
    const columnGeo = new THREE.CylinderGeometry(0.55, 0.6, this.height, 24);
    const columnMat = new THREE.MeshStandardMaterial({
      color: '#e4dfd5',
      roughness: 0.35,
      metalness: 0.05,
    });

    const colPositions = [
      { x: -7, z: -4 },
      { x: 7, z: -4 },
      { x: -7, z: 4 },
      { x: 7, z: 4 },
    ];

    colPositions.forEach((pos) => {
      const colMesh = new THREE.Mesh(columnGeo, columnMat);
      colMesh.position.set(pos.x, this.height / 2, pos.z);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      this.group.appendChild(colMesh);

      const baseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.4, 1.5),
        new THREE.MeshStandardMaterial({ color: '#2c2823', roughness: 0.4 })
      );
      baseMesh.position.set(pos.x, 0.2, pos.z);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      this.group.appendChild(baseMesh);

      // Đăng ký vật cản va chạm cột
      const box = new THREE.Box3(
        new THREE.Vector3(pos.x - 0.75, 0, pos.z - 0.75),
        new THREE.Vector3(pos.x + 0.75, this.height, pos.z + 0.75)
      );
      this.obstacleBoxes.push(box);
    });

    // 6. BỤC TRUNG TÂM GIỚI THIỆU SẢNH
    const podiumBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.2, 0.35, 32),
      new THREE.MeshStandardMaterial({ color: '#2c2823', roughness: 0.3 })
    );
    podiumBase.position.set(0, 0.175, 0);
    podiumBase.castShadow = true;
    podiumBase.receiveShadow = true;
    this.group.appendChild(podiumBase);

    const podiumPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.8, 0.8, 32),
      new THREE.MeshStandardMaterial({ color: '#c59b4c', metalness: 0.8, roughness: 0.2 })
    );
    podiumPillar.position.set(0, 0.75, 0);
    podiumPillar.castShadow = true;
    this.group.appendChild(podiumPillar);

    // Vật phẩm mô hình tượng trưng trung tâm (Viên pha lê bảo vật)
    const gemGeo = new THREE.OctahedronGeometry(0.5, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: '#e6b96e',
      roughness: 0.15,
      metalness: 0.9,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 1.45, 0);
    gem.castShadow = true;
    this.group.appendChild(gem);

    // Đăng ký va chạm bục trung tâm
    this.obstacleBoxes.push(
      new THREE.Box3(new THREE.Vector3(-2.0, 0, -2.0), new THREE.Vector3(2.0, 1.6, 2.0))
    );
  }

  /**
   * Thiết lập hệ thống ánh sáng ấm và đổ bóng
   * TUÂN THỦ NGHIÊM NGẶT: Tối đa 1 đèn đổ bóng (castShadow) trong toàn phòng
   */
  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight('#fdf6ed', '#3a3127', 0.85);
    hemiLight.position.set(0, this.height, 0);
    this.group.appendChild(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fff1de', 1.8);
    dirLight.position.set(6, this.height - 0.5, 5);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 14;
    dirLight.shadow.camera.bottom = -14;
    dirLight.shadow.bias = -0.0005;

    this.group.appendChild(dirLight);
    this.group.appendChild(dirLight.target);

    const boardSpot = new THREE.SpotLight('#ffdca8', 2.4, 12, Math.PI / 4, 0.4);
    boardSpot.position.set(0, this.height - 0.8, -this.depth / 2 + 4.5);
    boardSpot.target.position.set(0, 4.3, -this.depth / 2);
    boardSpot.castShadow = false;
    this.group.appendChild(boardSpot);
    this.group.appendChild(boardSpot.target);
  }

  /**
   * Khởi tạo hoặc khôi phục ranh giới và vật cản cho Sảnh chính (F1.4)
   */
  public setupBoundariesAndObstacles(): void {
    const halfW = this.width / 2;
    const halfD = this.depth / 2;

    this.collisionSystem.setBounds({
      minX: -halfW + 0.2,
      maxX: halfW - 0.2,
      minZ: -halfD + 0.2,
      maxZ: halfD - 0.2,
    });

    this.collisionSystem.clearObstacles();
    this.obstacleBoxes.forEach((box) => {
      this.collisionSystem.addObstacle(box);
    });
  }
}
