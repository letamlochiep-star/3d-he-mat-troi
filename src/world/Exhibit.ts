import * as THREE from 'three';
import { ExhibitData, ProceduralConfig } from '../types';
import { CollisionSystem } from '../player/CollisionSystem';
import { STRINGS_VI } from '../ui/strings.vi';

/**
 * Lớp đại diện cho một Hiện vật trưng bày 3D trong phòng (F2.2)
 */
export class Exhibit {
  public readonly group: THREE.Group;
  public readonly data: ExhibitData;
  public readonly centerPosition = new THREE.Vector3();
  private readonly collisionSystem: CollisionSystem;

  private rotatingModelGroup: THREE.Group | null = null;
  private cloudsMesh: THREE.Mesh | null = null;
  private rotationSpeed = 0.35; // rad/s
  private isRetrograde = false;

  constructor(data: ExhibitData, collisionSystem: CollisionSystem) {
    this.data = data;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();
    this.group.name = `Exhibit_${data.id}`;

    this.setupPosition();
    this.buildExhibitVisuals();
  }

  private setupPosition(): void {
    if ('x' in this.data.position && 'z' in this.data.position) {
      this.group.position.set(this.data.position.x, this.data.position.y || 0, this.data.position.z);
    } else if ('wall' in this.data.position) {
      // Vị trí gắn trên tường
      const offset = this.data.position.offset || 0;
      const height = this.data.position.height || 2.2;
      this.group.position.set(offset, height, 0);
    }
    this.group.getWorldPosition(this.centerPosition);
  }

  /**
   * Dựng hiện vật 3D dựa trên loại (model, image, video) và cấu hình procedural
   */
  private buildExhibitVisuals(): void {
    if (this.data.type === 'model') {
      this.buildPedestal();
      this.buildModelExhibit();
    } else if (this.data.type === 'image') {
      this.buildWallPicture();
    } else {
      this.buildVideoScreen();
    }
  }

  /**
   * Tạo bục bệ trưng bày bằng đá viền kim loại đồng mạ vàng (F2.2)
   */
  private buildPedestal(): void {
    const pedestalGroup = new THREE.Group();

    // Chân đế dưới
    const baseGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.25, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#1a1815',
      roughness: 0.4,
      metalness: 0.6,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.125;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    pedestalGroup.appendChild(baseMesh);

    // Thân bục bằng đá cẩm thạch
    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.75, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#262933',
      roughness: 0.3,
      metalness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.625;
    bodyMesh.receiveShadow = true;
    bodyMesh.castShadow = true;
    pedestalGroup.appendChild(bodyMesh);

    // Mặt bục viền đồng mạ vàng
    const topGeo = new THREE.CylinderGeometry(1.3, 1.25, 0.1, 32);
    const topMat = new THREE.MeshStandardMaterial({
      color: '#c59b4c',
      roughness: 0.2,
      metalness: 0.85,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 1.05;
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    pedestalGroup.appendChild(topMesh);

    // Tấm biển tên hiện vật bằng đồng gắn trước mặt bục
    this.buildPedestalPlaque(pedestalGroup);

    this.group.appendChild(pedestalGroup);

    // Đăng ký hộp va chạm bục vào CollisionSystem để người chơi không đi xuyên qua
    const wp = new THREE.Vector3();
    this.group.getWorldPosition(wp);
    this.collisionSystem.addObstacle(
      new THREE.Box3(
        new THREE.Vector3(wp.x - 1.4, 0, wp.z - 1.4),
        new THREE.Vector3(wp.x + 1.4, 1.2, wp.z + 1.4)
      )
    );
  }

  /**
   * Biển tên hiện vật gắn trên bục
   */
  private buildPedestalPlaque(pedestalGroup: THREE.Group): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#11100e';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.font = 'bold 36px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#fef0cd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.title.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const plaqueGeo = new THREE.PlaneGeometry(0.9, 0.25);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.6,
    });
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaqueMesh.position.set(0, 0.65, 1.26);
    pedestalGroup.appendChild(plaqueMesh);
  }

  /**
   * Dựng mô hình thiên thể 3D theo cấu hình procedural (F2.2)
   */
  private buildModelExhibit(): void {
    const modelHolder = new THREE.Group();
    modelHolder.position.y = 1.1; // Đặt trên mặt bục cao 1.1m

    const proc = this.data.procedural;
    if (proc) {
      const celestial = this.createProceduralCelestial(proc);
      modelHolder.appendChild(celestial);
    } else {
      // Trường hợp không có procedural và chưa có file: Hiện khung [CHỜ NỘI DUNG]
      const placeholder = this.createPlaceholderObject();
      modelHolder.appendChild(placeholder);
    }

    this.group.appendChild(modelHolder);
  }

  /**
   * Tạo mô hình thiên thể thủ tục với vật liệu chi tiết & hiệu ứng thị giác
   */
  public createProceduralCelestial(proc: ProceduralConfig): THREE.Group {
    const celestialGroup = new THREE.Group();
    const radius = Math.min(proc.radius || 1.0, 1.6);
    const tiltRad = ((proc.tiltDeg || 0) * Math.PI) / 180;
    this.isRetrograde = !!proc.retrograde;

    // Trục xoay nghiêng
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = tiltRad;

    // Nhóm xoay quanh trục
    const spinGroup = new THREE.Group();
    this.rotatingModelGroup = spinGroup;

    const canvasTexture = this.generatePlanetaryTexture(proc.body);
    const sphereGeo = new THREE.SphereGeometry(radius, 48, 48);

    let sphereMat: THREE.Material;

    if (proc.body === 'sun') {
      // Mặt trời: phát sáng rực rỡ (emissive)
      sphereMat = new THREE.MeshBasicMaterial({
        map: canvasTexture,
        color: '#ffea78',
      });
      // Vầng hào quang (Halo)
      const haloGeo = new THREE.SphereGeometry(radius * 1.22, 32, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: '#ffaa00',
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      tiltGroup.appendChild(haloMesh);
    } else {
      sphereMat = new THREE.MeshStandardMaterial({
        map: canvasTexture,
        roughness: proc.body === 'earth' ? 0.45 : 0.75,
        metalness: 0.05,
      });
    }

    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    spinGroup.appendChild(sphereMesh);

    // Tầng mây Trái Đất (nếu có)
    if (proc.body === 'earth' && proc.clouds) {
      const cloudsTexture = this.generateCloudsTexture();
      const cloudsGeo = new THREE.SphereGeometry(radius * 1.025, 48, 48);
      const cloudsMat = new THREE.MeshStandardMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.45,
        roughness: 0.9,
      });
      this.cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
      spinGroup.appendChild(this.cloudsMesh);
    }

    // Hệ vành đai Sao Thổ (Saturn Ring)
    if (proc.ring) {
      const innerR = radius * 1.35;
      const outerR = radius * 2.3;
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
      const ringTexture = this.generateRingTexture();
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        roughness: 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.receiveShadow = true;
      ringMesh.castShadow = true;
      spinGroup.appendChild(ringMesh);
    }

    tiltGroup.appendChild(spinGroup);
    celestialGroup.appendChild(tiltGroup);

    // Nâng lên khỏi mặt bục
    celestialGroup.position.y = radius + 0.35;

    return celestialGroup;
  }

  /**
   * Tạo Texture hành tinh thủ tục bằng Canvas độ phân giải cao
   */
  private generatePlanetaryTexture(body: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (body === 'sun') {
      // Mặt trời: Plasma lửa vàng cam
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#ff4500');
      grad.addColorStop(0.5, '#ffa500');
      grad.addColorStop(1, '#ffd700');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
      for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 40 + 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body === 'earth') {
      // Trái đất: Đại dương xanh đậm + Lục địa xanh lá/nâu
      ctx.fillStyle = '#104e8b';
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = '#2e8b57';
      // Vẽ các khối lục địa tượng trưng
      const continents = [
        { x: 300, y: 180, r: 120 },
        { x: 420, y: 220, r: 90 },
        { x: 650, y: 160, r: 140 },
        { x: 700, y: 320, r: 110 },
        { x: 200, y: 340, r: 90 },
      ];
      continents.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Băng tuyết hai cực
      ctx.fillStyle = '#f0f8ff';
      ctx.fillRect(0, 0, 1024, 30);
      ctx.fillRect(0, 482, 1024, 30);
    } else if (body === 'moon') {
      // Mặt trăng: Xám hố va chạm
      ctx.fillStyle = '#8a8d91';
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = 'rgba(60, 62, 65, 0.4)';
      for (let i = 0; i < 120; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 25 + 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body === 'mars') {
      // Sao Hỏa: Đỏ gỉ sắt oxit + 2 chỏm băng
      ctx.fillStyle = '#b34726';
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = 'rgba(70, 20, 10, 0.3)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 150, Math.random() * 40);
      }
      // Chỏm băng cực
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 25);
      ctx.fillRect(0, 487, 1024, 25);
    } else if (body === 'jupiter') {
      // Sao Mộc: Các dải mây khí nâu/be sọc ngang + Vết Đỏ Lớn
      const colors = ['#d8b18a', '#b08456', '#e0c7a8', '#996f42', '#c99e74'];
      for (let y = 0; y < 512; y += 24) {
        ctx.fillStyle = colors[Math.floor(y / 24) % colors.length];
        ctx.fillRect(0, y, 1024, 24);
      }
      // Vết Đỏ Lớn (Great Red Spot)
      ctx.fillStyle = '#a63426';
      ctx.beginPath();
      ctx.ellipse(650, 310, 60, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (body === 'saturn') {
      // Sao Thổ: Màu vàng kem dải khí mượt
      const saturnColors = ['#e6d2a5', '#d6be8d', '#c9b17c', '#eedbb0'];
      for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = saturnColors[Math.floor(y / 32) % saturnColors.length];
        ctx.fillRect(0, y, 1024, 32);
      }
    } else if (body === 'uranus') {
      // Sao Thiên Vương: Xanh ngọc lam băng tuyết
      ctx.fillStyle = '#7ac9c7';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, 200, 1024, 112);
    } else if (body === 'neptune') {
      // Sao Hải Vương: Xanh thẫm đại dương sâu
      ctx.fillStyle = '#224ba3';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(10, 20, 60, 0.4)';
      ctx.fillRect(0, 240, 1024, 40);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(300, 220, 150, 12);
    } else {
      // Mặc định: Sao Thủy / hành tinh đá
      ctx.fillStyle = '#78756d';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(40, 40, 35, 0.35)';
      for (let i = 0; i < 70; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private generateCloudsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 30 + 10, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  private generateRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#bfa576';
    ctx.fillRect(0, 0, 512, 64);

    // Kẻ các dải đai băng đá
    for (let x = 0; x < 512; x += 8) {
      ctx.fillStyle = (x % 16 === 0) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, 0, 4, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Tạo khối vật thể tạm thời [CHỜ NỘI DUNG] khi chưa có mô hình
   */
  private createPlaceholderObject(): THREE.Group {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.6,
      wireframe: true,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.6;
    group.appendChild(box);
    this.rotatingModelGroup = group;
    return group;
  }

  /**
   * Dựng tranh treo tường (type === 'image')
   */
  private buildWallPicture(): void {
    const frameGeo = new THREE.BoxGeometry(2.4, 1.8, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    this.group.appendChild(frame);
  }

  /**
   * Dựng màn hình video (type === 'video')
   */
  private buildVideoScreen(): void {
    const screenGeo = new THREE.BoxGeometry(2.8, 1.6, 0.1);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.1 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    this.group.appendChild(screen);
  }

  /**
   * Cập nhật animation xoay chậm theo thời gian
   */
  public update(delta: number): void {
    if (this.rotatingModelGroup) {
      const dir = this.isRetrograde ? -1 : 1;
      this.rotatingModelGroup.rotation.y += this.rotationSpeed * dir * delta;
    }
    if (this.cloudsMesh) {
      // Mây xoay nhanh hơn bề mặt một chút
      this.cloudsMesh.rotation.y += (this.rotationSpeed * 1.3) * delta;
    }
  }

  /**
   * Tính khoảng cách từ người chơi đến hiện vật
   */
  public getDistance(playerPos: THREE.Vector3): number {
    this.group.getWorldPosition(this.centerPosition);
    return Math.sqrt(
      Math.pow(playerPos.x - this.centerPosition.x, 2) +
      Math.pow(playerPos.z - this.centerPosition.z, 2)
    );
  }

  /**
   * Tạo bản sao 3D để hiển thị trong khung xem tương tác của Detail Modal (F2.4)
   */
  public createPreviewClone(): THREE.Object3D {
    if (this.data.procedural) {
      return this.createProceduralCelestial(this.data.procedural);
    }
    return this.createPlaceholderObject();
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    this.group.clear();
  }
}
