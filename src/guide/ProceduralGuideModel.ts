import * as THREE from 'three';

export type GuideAnimationState = 'idle' | 'walk' | 'talk' | 'wave';

/**
 * Mô hình nhân vật 3D Hướng dẫn viên Anh Minh theo chuẩn F3.1 và F3.2
 * Chiều cao 1,75 m, tóc đen gọn, sơ mi trắng, áo gi-lê xanh navy, quần tối màu, thẻ tên trước ngực.
 */
export class ProceduralGuideModel {
  public readonly group: THREE.Group;

  // Các khớp cử động
  private headGroup!: THREE.Group;
  private torsoGroup!: THREE.Group;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;

  // Quản lý trạng thái animation và chuyển động tác mượt 0.3s (F3.2)
  private currentAnim: GuideAnimationState = 'idle';
  private prevAnim: GuideAnimationState = 'idle';
  private transitionTimer = 0;
  private readonly transitionDuration = 0.3; // 0.3 giây theo đặc tả
  private animTime = 0;

  constructor(guideName = 'ANH MINH') {
    this.group = new THREE.Group();
    this.group.name = 'ProceduralGuide';

    this.buildCharacterVisuals(guideName);
  }

  public setAnimation(state: GuideAnimationState): void {
    if (this.currentAnim === state) return;
    this.prevAnim = this.currentAnim;
    this.currentAnim = state;
    this.transitionTimer = 0;
  }

  public getAnimation(): GuideAnimationState {
    return this.currentAnim;
  }

  /**
   * Dựng toàn bộ chi tiết ngoại hình nhân vật (Cao 1.75m)
   */
  private buildCharacterVisuals(guideName: string): void {
    // Vật liệu
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#f5d0b5', // Làn da sáng tươi tắn
      roughness: 0.6,
      metalness: 0.05,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: '#1a1818', // Tóc đen gọn gàng
      roughness: 0.8,
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc', // Áo sơ mi trắng tinh tế
      roughness: 0.5,
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: '#16233b', // Áo gi-lê xanh navy lịch lãm
      roughness: 0.45,
      metalness: 0.1,
    });

    const tieMat = new THREE.MeshStandardMaterial({
      color: '#8b2626', // Cà vạt đỏ đô sang trọng
      roughness: 0.4,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: '#1b1d24', // Quần âu tối màu
      roughness: 0.6,
    });

    const shoesMat = new THREE.MeshStandardMaterial({
      color: '#111111', // Giày da đen
      roughness: 0.25,
      metalness: 0.6,
    });

    // 1. CHÂN (Hai chân cao 0.85m)
    // Chân trái
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.16, 0.85, 0);

    const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.8, 16), pantsMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLegGroup.appendChild(lLegMesh);

    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), shoesMat);
    lShoe.position.set(0, -0.8, 0.04);
    lShoe.castShadow = true;
    this.leftLegGroup.appendChild(lShoe);
    this.group.appendChild(this.leftLegGroup);

    // Chân phải
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.16, 0.85, 0);

    const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.8, 16), pantsMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLegGroup.appendChild(rLegMesh);

    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), shoesMat);
    rShoe.position.set(0, -0.8, 0.04);
    rShoe.castShadow = true;
    this.rightLegGroup.appendChild(rShoe);
    this.group.appendChild(this.rightLegGroup);

    // 2. THÂN (Torso: eo, ngực, sơ mi trắng, áo gi-lê navy)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.85, 0);

    // Lớp sơ mi trắng nền
    const shirtBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), shirtMat);
    shirtBody.position.y = 0.28;
    shirtBody.castShadow = true;
    this.torsoGroup.appendChild(shirtBody);

    // Áo gi-lê xanh navy ôm bên ngoài
    const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.26), vestMat);
    vestMesh.position.y = 0.28;
    vestMesh.castShadow = true;
    this.torsoGroup.appendChild(vestMesh);

    // Cổ áo sơ mi & Cà vạt
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), shirtMat);
    collar.position.set(0, 0.56, 0.08);
    this.torsoGroup.appendChild(collar);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.04), tieMat);
    tie.position.set(0, 0.36, 0.14);
    this.torsoGroup.appendChild(tie);

    // Thẻ tên trước ngực (Nametag F3.1)
    const nametagCanvas = document.createElement('canvas');
    nametagCanvas.width = 256;
    nametagCanvas.height = 80;
    const nctx = nametagCanvas.getContext('2d')!;
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(0, 0, 256, 80);
    nctx.strokeStyle = '#16233b';
    nctx.lineWidth = 6;
    nctx.strokeRect(4, 4, 248, 72);
    nctx.fillStyle = '#16233b';
    nctx.font = 'bold 36px "Be Vietnam Pro", sans-serif';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(guideName.toUpperCase(), 128, 42);

    const nametagTex = new THREE.CanvasTexture(nametagCanvas);
    const nametagMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.04),
      new THREE.MeshStandardMaterial({ map: nametagTex, roughness: 0.3 })
    );
    nametagMesh.position.set(0.12, 0.42, 0.14);
    this.torsoGroup.appendChild(nametagMesh);

    this.group.appendChild(this.torsoGroup);

    // 3. ĐẦU (Head & Hair: đỉnh đầu đạt 1.75m)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.48, 0);

    // Khuôn mặt
    const faceMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.22), skinMat);
    faceMesh.position.y = 0.13;
    faceMesh.castShadow = true;
    this.headGroup.appendChild(faceMesh);

    // Mái tóc đen gọn gàng rẽ ngôi lịch thiệp
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.24), hairMat);
    hairTop.position.set(0, 0.25, -0.01);
    this.headGroup.appendChild(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.08), hairMat);
    hairBack.position.set(0, 0.15, -0.1);
    this.headGroup.appendChild(hairBack);

    // Mắt
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#111111' });
    const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), eyeMat);
    lEye.position.set(-0.06, 0.14, 0.115);
    this.headGroup.appendChild(lEye);

    const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), eyeMat);
    rEye.position.set(0.06, 0.14, 0.115);
    this.headGroup.appendChild(rEye);

    this.group.appendChild(this.headGroup);

    // 4. TAY (Hai cánh tay cao 0.58m)
    // Tay trái
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.27, 1.38, 0);

    const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.5, 16), shirtMat);
    lArmMesh.position.y = -0.25;
    lArmMesh.castShadow = true;
    this.leftArmGroup.appendChild(lArmMesh);

    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), skinMat);
    lHand.position.y = -0.52;
    this.leftArmGroup.appendChild(lHand);
    this.group.appendChild(this.leftArmGroup);

    // Tay phải
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.27, 1.38, 0);

    const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.5, 16), shirtMat);
    rArmMesh.position.y = -0.25;
    rArmMesh.castShadow = true;
    this.rightArmGroup.appendChild(rArmMesh);

    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), skinMat);
    rHand.position.y = -0.52;
    this.rightArmGroup.appendChild(rHand);
    this.group.appendChild(this.rightArmGroup);
  }

  /**
   * Tính toán các góc khớp cho một trạng thái cụ thể tại thời điểm time
   */
  private samplePose(state: GuideAnimationState, time: number) {
    const pose = {
      headRotX: 0,
      headRotY: 0,
      headRotZ: 0,
      torsoPosY: 0.85,
      torsoScaleY: 1.0,
      leftArmRotX: 0,
      leftArmRotY: 0,
      leftArmRotZ: 0.05,
      rightArmRotX: 0,
      rightArmRotY: 0,
      rightArmRotZ: -0.05,
      leftLegRotX: 0,
      rightLegRotX: 0,
    };

    if (state === 'idle') {
      // Động tác thở nhấp nhô nhẹ ngực và đầu
      const breath = Math.sin(time * 2.2);
      pose.torsoScaleY = 1.0 + breath * 0.015;
      pose.torsoPosY = 0.85 + breath * 0.006;
      pose.headRotX = breath * 0.03;
      pose.leftArmRotZ = 0.08 + breath * 0.02;
      pose.rightArmRotZ = -0.08 - breath * 0.02;
    } else if (state === 'walk') {
      // Động tác bước đi nhịp nhàng: Chân tay vung so le, cơ thể nhấp nhô
      const walkFreq = 7.5;
      const legAngle = Math.sin(time * walkFreq) * 0.45;
      const armAngle = Math.sin(time * walkFreq) * 0.35;

      pose.leftLegRotX = legAngle;
      pose.rightLegRotX = -legAngle;

      pose.leftArmRotX = -armAngle;
      pose.rightArmRotX = armAngle;

      // Nhấp nhô bước chân
      pose.torsoPosY = 0.85 + Math.abs(Math.sin(time * walkFreq)) * 0.04;
    } else if (state === 'talk') {
      // Động tác nói kèm gật đầu và cử chỉ tay thuyết minh sinh động (F3.2)
      const talkFreq = 5.0;
      pose.headRotX = 0.05 + Math.sin(time * talkFreq) * 0.1;
      pose.headRotY = Math.sin(time * 2.5) * 0.08;

      // Tay phải đưa lên ngang ngực làm cử chỉ giải thích
      pose.rightArmRotX = -0.85 + Math.sin(time * 3.5) * 0.2;
      pose.rightArmRotZ = -0.35 + Math.sin(time * 2.8) * 0.1;

      // Tay trái cử động nhẹ nhàng
      pose.leftArmRotX = -0.3 + Math.sin(time * 2.0) * 0.15;
      pose.leftArmRotZ = 0.15;

      const breath = Math.sin(time * 2.0);
      pose.torsoScaleY = 1.0 + breath * 0.015;
    } else if (state === 'wave') {
      // Động tác giơ tay phải vẫy chào thân thiện (F3.2)
      pose.headRotZ = 0.06; // Đầu hơi nghiêng thân thiện
      pose.headRotX = 0.04;

      // Tay phải giơ lên cao vẫy
      pose.rightArmRotZ = -2.35;
      pose.rightArmRotX = -0.2;
      pose.rightArmRotY = Math.sin(time * 8.0) * 0.35; // Cẳng tay vẫy qua lại

      pose.leftArmRotZ = 0.08;
    }

    return pose;
  }

  /**
   * Cập nhật animation và nội suy chuyển động tác mượt mà trong 0.3 giây
   */
  public update(delta: number): void {
    this.animTime += delta;

    if (this.currentAnim !== this.prevAnim && this.transitionTimer < this.transitionDuration) {
      this.transitionTimer += delta;
    }

    const t = Math.min(1.0, this.transitionTimer / this.transitionDuration);

    const prevPose = this.samplePose(this.prevAnim, this.animTime);
    const currPose = this.samplePose(this.currentAnim, this.animTime);

    // Hàm nội suy tuyến tính góc
    const lerp = (a: number, b: number) => a + (b - a) * t;

    // Áp dụng các góc nội suy vào khung xương
    this.headGroup.rotation.x = lerp(prevPose.headRotX, currPose.headRotX);
    this.headGroup.rotation.y = lerp(prevPose.headRotY, currPose.headRotY);
    this.headGroup.rotation.z = lerp(prevPose.headRotZ, currPose.headRotZ);

    this.torsoGroup.position.y = lerp(prevPose.torsoPosY, currPose.torsoPosY);
    this.torsoGroup.scale.y = lerp(prevPose.torsoScaleY, currPose.torsoScaleY);

    this.leftArmGroup.rotation.x = lerp(prevPose.leftArmRotX, currPose.leftArmRotX);
    this.leftArmGroup.rotation.y = lerp(prevPose.leftArmRotY, currPose.leftArmRotY);
    this.leftArmGroup.rotation.z = lerp(prevPose.leftArmRotZ, currPose.leftArmRotZ);

    this.rightArmGroup.rotation.x = lerp(prevPose.rightArmRotX, currPose.rightArmRotX);
    this.rightArmGroup.rotation.y = lerp(prevPose.rightArmRotY, currPose.rightArmRotY);
    this.rightArmGroup.rotation.z = lerp(prevPose.rightArmRotZ, currPose.rightArmRotZ);

    this.leftLegGroup.rotation.x = lerp(prevPose.leftLegRotX, currPose.leftLegRotX);
    this.rightLegGroup.rotation.x = lerp(prevPose.rightLegRotX, currPose.rightLegRotX);
  }
}
