import * as THREE from 'three';
import { CollisionSystem } from './CollisionSystem';

export class FirstPersonController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly collisionSystem: CollisionSystem;

  // Trạng thái góc nhìn
  private yaw = Math.PI; // Mặc định hướng về phía bắc (nhìn vào tường đối diện lối vào)
  private pitch = 0;
  private readonly minPitch = -Math.PI / 2.2;
  private readonly maxPitch = Math.PI / 2.2;
  private readonly mouseSensitivity = 0.0022;
  private readonly touchSensitivity = 0.004;

  // Tốc độ di chuyển (mét / giây)
  public walkSpeed = 3.8;
  public runSpeed = 7.0;

  // Trạng thái phím máy tính
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
  };

  // Trạng thái cần ảo di động (Joystick)
  private joystickActive = false;
  private joystickVector = { x: 0, y: 0 };
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickMaxRadius = 45;
  private joystickBaseEl: HTMLElement | null = null;
  private joystickStickEl: HTMLElement | null = null;

  // Trạng thái vuốt nhìn trên di động
  private lookTouchId: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;

  // Trạng thái chuột kéo (hỗ trợ cả Pointer Lock và Chuột kéo thường)
  private isMouseDown = false;
  private isPointerLocked = false;
  private enabled = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    collisionSystem: CollisionSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionSystem = collisionSystem;

    // Chiều cao mắt cố định 1.65m theo đặc tả
    this.camera.position.set(0, 1.65, 8);
    this.updateCameraRotation();

    this.initKeyboardListeners();
    this.initMouseListeners();
    this.initTouchJoystick();
  }

  public setEnabled(state: boolean): void {
    this.enabled = state;
    if (!state) {
      this.resetInputs();
      if (document.pointerLockElement === this.domElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private resetInputs(): void {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.run = false;
    this.joystickVector = { x: 0, y: 0 };
    this.joystickActive = false;
    if (this.joystickStickEl) {
      this.joystickStickEl.style.transform = 'translate(-50%, -50%) translate(0px, 0px)';
    }
  }

  private updateCameraRotation(): void {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  // --- 1. Lắng nghe bàn phím PC ---
  private initKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.run = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.run = false;
          break;
      }
    });
  }

  // --- 2. Lắng nghe chuột PC ---
  private initMouseListeners(): void {
    this.domElement.addEventListener('click', () => {
      if (this.enabled && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;

      if (this.isPointerLocked) {
        this.rotateView(e.movementX * this.mouseSensitivity, e.movementY * this.mouseSensitivity);
      } else if (this.isMouseDown) {
        this.rotateView(e.movementX * this.mouseSensitivity, e.movementY * this.mouseSensitivity);
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  private rotateView(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX;
    this.pitch -= deltaY;

    // Giới hạn góc nhìn lên xuống
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    this.updateCameraRotation();
  }

  // --- 3. Cần điều khiển ảo (Touch Joystick) & Vuốt nhìn trên Di động ---
  private initTouchJoystick(): void {
    // Tạo phần tử DOM cho cần ảo
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'virtual-joystick-zone';
    joystickContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 130px;
      height: 130px;
      z-index: 100;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      pointer-events: auto;
      display: none;
    `;

    const base = document.createElement('div');
    base.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      border: 2px solid rgba(212, 163, 89, 0.4);
      backdrop-filter: blur(4px);
    `;

    const stick = document.createElement('div');
    stick.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: radial-gradient(circle, #e6b96e, #b88636);
      transform: translate(-50%, -50%);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      pointer-events: none;
      transition: transform 0.05s ease-out;
    `;

    joystickContainer.appendChild(base);
    joystickContainer.appendChild(stick);
    document.body.appendChild(joystickContainer);

    this.joystickBaseEl = base;
    this.joystickStickEl = stick;

    // Hiện joystick khi phát hiện thiết bị cảm ứng hoặc màn hình nhỏ
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      joystickContainer.style.display = isTouch ? 'block' : 'none';
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);

    // Xử lý touch trên joystick zone
    joystickContainer.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;
        this.joystickActive = true;

        const rect = base.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        this.updateJoystickPosition(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    // Lắng nghe touch toàn màn hình cho xoay góc nhìn và nhả joystick
    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this.enabled) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];

          // 1. Cập nhật vị trí joystick
          if (touch.identifier === this.joystickTouchId) {
            this.updateJoystickPosition(touch.clientX, touch.clientY);
          }

          // 2. Cập nhật xoay góc nhìn từ ngón tay thứ 2 hoặc vùng bên phải
          if (touch.identifier === this.lookTouchId) {
            const deltaX = (touch.clientX - this.lastTouchX) * this.touchSensitivity;
            const deltaY = (touch.clientY - this.lastTouchY) * this.touchSensitivity;
            this.rotateView(deltaX, deltaY);
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
          }
        }
      },
      { passive: false }
    );

    window.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        // Nếu chạm ngoài vùng joystick thì dùng làm ngón xoay nhìn
        if (touch.identifier !== this.joystickTouchId && this.lookTouchId === null) {
          // Bỏ qua nếu chạm vào các nút điều khiển UI có sẵn
          const target = touch.target as HTMLElement;
          if (target && target.closest('#virtual-joystick-zone, button, .ui-interactive')) {
            continue;
          }

          this.lookTouchId = touch.identifier;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        }
      }
    });

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.joystickActive = false;
          this.joystickVector = { x: 0, y: 0 };
          if (this.joystickStickEl) {
            this.joystickStickEl.style.transform = 'translate(-50%, -50%) translate(0px, 0px)';
          }
        }

        if (touch.identifier === this.lookTouchId) {
          this.lookTouchId = null;
        }
      }
    };

    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  }

  private updateJoystickPosition(touchX: number, touchY: number): void {
    const dx = touchX - this.joystickCenter.x;
    const dy = touchY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, this.joystickMaxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    if (this.joystickStickEl) {
      this.joystickStickEl.style.transform = `translate(-50%, -50%) translate(${stickX}px, ${stickY}px)`;
    }

    // Chuẩn hóa vector [-1, 1]
    this.joystickVector = {
      x: stickX / this.joystickMaxRadius,
      y: stickY / this.joystickMaxRadius,
    };
  }

  // --- 4. Cập nhật vị trí mỗi khung hình (gọi từ render loop) ---
  public update(delta: number): void {
    if (!this.enabled) return;

    // Vector hướng di chuyển cục bộ
    let inputX = 0;
    let inputZ = 0;

    // 1. Nhận từ phím PC
    if (this.keys.forward) inputZ -= 1;
    if (this.keys.backward) inputZ += 1;
    if (this.keys.left) inputX -= 1;
    if (this.keys.right) inputX += 1;

    // 2. Nhận từ cần ảo Mobile
    if (this.joystickActive) {
      inputX += this.joystickVector.x;
      inputZ += this.joystickVector.y;
    }

    // Nếu không có lệnh di chuyển
    if (Math.abs(inputX) < 0.001 && Math.abs(inputZ) < 0.001) {
      return;
    }

    // Chuẩn hóa vector di chuyển
    const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (length > 1) {
      inputX /= length;
      inputZ /= length;
    }

    const currentSpeed = this.keys.run ? this.runSpeed : this.walkSpeed;
    const distance = currentSpeed * delta;

    // Tính hướng di chuyển theo góc quay yaw
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    const moveX = (forwardX * -inputZ + rightX * inputX) * distance;
    const moveZ = (forwardZ * -inputZ + rightZ * inputX) * distance;

    const currentPos = this.camera.position.clone();
    const intendedPos = new THREE.Vector3(
      currentPos.x + moveX,
      1.65, // Chiều cao mắt cố định 1.65m
      currentPos.z + moveZ
    );

    // Giải quyết va chạm với tường và vật cản (F1.4)
    const resolvedPos = this.collisionSystem.resolvePosition(currentPos, intendedPos, 0.4);

    this.camera.position.copy(resolvedPos);
  }

  public setPosition(x: number, z: number, yaw?: number): void {
    this.camera.position.set(x, 1.65, z);
    if (yaw !== undefined) {
      this.yaw = yaw;
      this.pitch = 0;
      this.updateCameraRotation();
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position;
  }

  public getYaw(): number {
    return this.yaw;
  }
}
