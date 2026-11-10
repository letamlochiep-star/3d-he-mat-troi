import * as THREE from 'three';
import { RoomData, FloorMaterial, LightingStyle } from '../types';
import { CollisionSystem } from '../player/CollisionSystem';
import { Door } from './Door';
import { Exhibit } from './Exhibit';
import { STRINGS_VI } from '../ui/strings.vi';

/**
 * Lớp đại diện cho một căn phòng đang hoạt động (RoomInstance)
 */
export class RoomInstance {
  public readonly group: THREE.Group;
  public readonly data: RoomData;
  public readonly returnDoor: Door;
  public readonly exhibits: Exhibit[] = [];
  private readonly collisionSystem: CollisionSystem;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor(data: RoomData, collisionSystem: CollisionSystem) {
    this.data = data;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();
    this.group.name = `Room_${data.id}`;

    // Tạo cửa quay về sảnh chính ở lối vào phòng (tường Nam)
    const southZ = data.size.depth / 2;
    this.returnDoor = new Door({
      targetRoomId: 'lobby',
      targetRoomName: STRINGS_VI.doorReturnLobby,
      position: new THREE.Vector3(0, 0, southZ - 0.1),
      rotationY: Math.PI,
      width: 2.8,
      height: 3.4,
    });
    this.group.appendChild(this.returnDoor.group);
  }

  public registerDisposable(item: { dispose: () => void }): void {
    this.disposables.push(item);
  }

  /**
   * Giải phóng triệt để tài nguyên GPU/WebGL khi khách rời phòng
   */
  public dispose(): void {
    this.exhibits.forEach((e) => e.dispose());
    this.exhibits.length = 0;

    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              this.disposeMaterial(mat);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    for (const item of this.disposables) {
      try {
        item.dispose();
      } catch (e) {
        console.warn('Lỗi dispose:', e);
      }
    }

    this.disposables.length = 0;
    this.group.clear();
    this.collisionSystem.clearObstacles();
  }

  private disposeMaterial(mat: THREE.Material): void {
    const std = mat as THREE.MeshStandardMaterial;
    if (std.map) std.map.dispose();
    if (std.normalMap) std.normalMap.dispose();
    if (std.roughnessMap) std.roughnessMap.dispose();
    mat.dispose();
  }
}

/**
 * Xây dựng phòng trưng bày từ dữ liệu rooms[] trong museum.json (F1.2)
 */
export class RoomBuilder {
  /**
   * Tạo sàn theo chất liệu khai báo trong dữ liệu (stone, wood, carpet)
   */
  private static createFloorTexture(type: FloorMaterial): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (type === 'wood') {
      // Sàn gỗ với các thanh ván (Parquet)
      ctx.fillStyle = '#4a321a';
      ctx.fillRect(0, 0, 512, 512);

      // Kẻ các thanh ván gỗ
      ctx.strokeStyle = '#2d1e0f';
      ctx.lineWidth = 3;
      for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Vân gỗ tự nhiên
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y + (Math.random() - 0.5) * 10);
        ctx.stroke();
      }
    } else if (type === 'carpet') {
      // Sàn thảm nhung cao cấp
      ctx.fillStyle = '#1e2430';
      ctx.fillRect(0, 0, 512, 512);

      // Họa tiết hoa văn thảm chìm
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let x = 0; x < 512; x += 16) {
        for (let y = 0; y < 512; y += 16) {
          if ((x + y) % 32 === 0) {
            ctx.fillRect(x, y, 8, 8);
          }
        }
      }
    } else {
      // Sàn đá (stone) mặc định
      ctx.fillStyle = '#1c222c';
      ctx.fillRect(0, 0, 512, 512);

      // Kẻ gạch đá hoa cương
      ctx.strokeStyle = '#2e3848';
      ctx.lineWidth = 3;
      for (let x = 0; x <= 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }

  /**
   * Thiết lập hệ thống chiếu sáng theo phong cách (warm, cool, dramatic)
   * TUÂN THỦ NGHIÊM NGẶT: Tối đa 1 đèn đổ bóng (castShadow) mỗi phòng
   */
  private static setupLighting(
    instance: RoomInstance,
    style: LightingStyle,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number
  ): void {
    let hemiSky = '#ffffff';
    let hemiGround = '#222222';
    let hemiIntensity = 0.7;

    let dirColor = '#ffffff';
    let dirIntensity = 1.6;

    if (style === 'warm') {
      hemiSky = '#fff5ea';
      hemiGround = '#382a1c';
      hemiIntensity = 0.85;
      dirColor = '#ffe3be';
      dirIntensity = 1.8;
    } else if (style === 'cool') {
      hemiSky = '#e8f4fc';
      hemiGround = '#152438';
      hemiIntensity = 0.8;
      dirColor = '#dcf0ff';
      dirIntensity = 1.7;
    } else if (style === 'dramatic') {
      // Ánh sáng kịch tính: nền tối sâu, nguồn sáng chính sắc nét
      hemiSky = '#3a4454';
      hemiGround = '#080c14';
      hemiIntensity = 0.35;
      dirColor = '#fff6e5';
      dirIntensity = 2.4;
    }

    // 1. Đèn môi trường nhẹ (không đổ bóng)
    const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
    hemiLight.position.set(0, roomHeight, 0);
    instance.group.appendChild(hemiLight);

    // 2. DUY NHẤT 1 ĐÈN ĐỔ BÓNG (castShadow) CHO TOÀN PHÒNG
    const dirLight = new THREE.DirectionalLight(dirColor, dirIntensity);
    dirLight.position.set(roomWidth * 0.25, roomHeight - 0.5, roomDepth * 0.25);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -roomWidth / 2;
    dirLight.shadow.camera.right = roomWidth / 2;
    dirLight.shadow.camera.top = roomDepth / 2;
    dirLight.shadow.camera.bottom = -roomDepth / 2;
    dirLight.shadow.bias = -0.0005;

    instance.group.appendChild(dirLight);
    instance.group.appendChild(dirLight.target);
  }

  /**
   * Dựng một phòng hoàn chỉnh từ đối tượng RoomData
   */
  public static buildRoom(data: RoomData, collisionSystem: CollisionSystem): RoomInstance {
    const instance = new RoomInstance(data, collisionSystem);

    const { width, depth, height } = data.size;
    const halfW = width / 2;
    const halfD = depth / 2;

    // 1. SÀN
    const floorTexture = this.createFloorTexture(data.style.floor);
    instance.registerDisposable(floorTexture);

    let floorRoughness = 0.25;
    let floorMetalness = 0.05;
    if (data.style.floor === 'wood') {
      floorRoughness = 0.45;
      floorMetalness = 0.0;
    } else if (data.style.floor === 'carpet') {
      floorRoughness = 0.95;
      floorMetalness = 0.0;
    }

    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: floorRoughness,
      metalness: floorMetalness,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    instance.group.appendChild(floor);

    // 2. TRẦN
    const ceilingGeo = new THREE.PlaneGeometry(width, depth);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#121620',
      roughness: 0.85,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    instance.group.appendChild(ceiling);

    // 3. TƯỜNG (Sơn màu khai báo trong style.wall)
    const wallColor = data.style.wall || '#27384d';
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
      metalness: 0.05,
    });

    // Tường Bắc (đối diện lối vào)
    const northWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    northWall.position.set(0, height / 2, -halfD);
    northWall.receiveShadow = true;
    instance.group.appendChild(northWall);

    // Tường Nam (chứa cửa quay về sảnh)
    const southWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    southWall.position.set(0, height / 2, halfD);
    southWall.rotation.y = Math.PI;
    southWall.receiveShadow = true;
    instance.group.appendChild(southWall);

    // Tường Đông
    const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    eastWall.position.set(halfW, height / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.receiveShadow = true;
    instance.group.appendChild(eastWall);

    // Tường Tây
    const westWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
    westWall.position.set(-halfW, height / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    westWall.receiveShadow = true;
    instance.group.appendChild(westWall);

    // 4. ÁNH SÁNG THEO PHONG CÁCH
    this.setupLighting(instance, data.style.lighting, width, depth, height);

    // 5. DỰNG CÁC HIỆN VẬT TRONG PHÒNG (F2.2)
    if (Array.isArray(data.exhibits)) {
      data.exhibits.forEach((exData) => {
        const exhibit = new Exhibit(exData, collisionSystem);
        instance.exhibits.push(exhibit);
        instance.group.appendChild(exhibit.group);
      });
    }

    // 6. CẬP NHẬT RÀNG BUỘC VA CHẠM (F1.4)
    collisionSystem.setBounds({
      minX: -halfW + 0.3,
      maxX: halfW - 0.3,
      minZ: -halfD + 0.3,
      maxZ: halfD - 0.3,
    });

    // Thêm vật cản của cửa quay về sảnh
    instance.returnDoor.getObstacleBoxes().forEach((box) => {
      collisionSystem.addObstacle(box);
    });

    return instance;
  }
}
