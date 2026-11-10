import * as THREE from 'three';

export interface Updatable {
  update(delta: number): void;
}

export type UpdateCallback = (delta: number) => void;

/**
 * Lớp quản trị vòng lặp đồ họa Three.js trung tâm
 * Cấu hình ACES Filmic Tone Mapping, Shadow Map và tối ưu hiệu năng
 */
export class Engine {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  private readonly clock: THREE.Clock;
  private readonly updatables: Set<Updatable | UpdateCallback> = new Set();
  private isRunning = false;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1118');

    // Camera góc nhìn thứ nhất, FOV 75 độ
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Vị trí mặc định tạm thời (FirstPersonController sẽ cập nhật)
    this.camera.position.set(0, 1.65, 0);

    // Cấu hình WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Tone Mapping ACES Filmic và Không gian màu sRGB theo yêu cầu F1.3
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Kích hoạt bóng đổ mềm (PCF Soft)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  public addUpdatable(item: Updatable | UpdateCallback): void {
    this.updatables.add(item);
  }

  public removeUpdatable(item: Updatable | UpdateCallback): void {
    this.updatables.delete(item);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    const delta = Math.min(this.clock.getDelta(), 0.1); // Giới hạn delta tránh nhảy bước khi giật khung hình

    for (const item of this.updatables) {
      if (typeof item === 'function') {
        item(delta);
      } else {
        item.update(delta);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
