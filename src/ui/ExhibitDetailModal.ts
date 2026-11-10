import * as THREE from 'three';
import { ExhibitData } from '../types';
import { STRINGS_VI } from './strings.vi';

/**
 * Bảng chi tiết hiện vật với khung xem 3D xoay & phóng to tương tác (F2.3 & F2.4)
 */
export class ExhibitDetailModal {
  private readonly container: HTMLElement;
  private isOpen = false;
  private currentExhibit: ExhibitData | null = null;
  private onCloseCallback: () => void;

  // Thành phần 3D Inspector riêng biệt cho bảng chi tiết
  private inspectorRenderer: THREE.WebGLRenderer | null = null;
  private inspectorScene: THREE.Scene | null = null;
  private inspectorCamera: THREE.PerspectiveCamera | null = null;
  private inspectorModelGroup: THREE.Group | null = null;
  private inspectorAnimId: number | null = null;

  // Điều khiển xoay / zoom trong Inspector
  private isDragging = false;
  private prevMousePos = { x: 0, y: 0 };
  private modelRotation = { x: 0, y: 0 };
  private cameraDistance = 4.2;

  constructor(onClose: () => void) {
    this.onCloseCallback = onClose;

    this.container = document.createElement('div');
    this.container.id = 'exhibit-detail-modal';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(8, 11, 16, 0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #f1f5f9;
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      box-sizing: border-box;
    `;
    document.body.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') {
        this.close();
      }
    });
  }

  public open(exhibit: ExhibitData, create3DPreview?: (data: ExhibitData) => THREE.Object3D): void {
    this.currentExhibit = exhibit;
    this.isOpen = true;
    this.container.style.display = 'flex';

    this.render(exhibit);

    if (exhibit.type === 'model') {
      const canvas = this.container.querySelector('#inspector-canvas') as HTMLCanvasElement | null;
      if (canvas && create3DPreview) {
        this.init3DInspector(canvas, create3DPreview(exhibit));
      }
    }
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.stop3DInspector();
    this.container.style.display = 'none';
    this.currentExhibit = null;
    this.onCloseCallback();
  }

  private render(exhibit: ExhibitData): void {
    const isModel = exhibit.type === 'model';
    const statsHtml =
      exhibit.stats && exhibit.stats.length > 0
        ? `
        <div style="margin-top: 14px;">
          <h4 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #d4a359; margin-bottom: 8px;">
            ${STRINGS_VI.exhibitStatsTitle}
          </h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            ${exhibit.stats
              .map(
                (s) => `
              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; border-radius: 6px;">
                <span style="font-size: 11.5px; color: #94a3b8; display: block;">${s.label}</span>
                <strong style="font-size: 14px; color: #f1f5f9;">${s.value}</strong>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
        : '';

    this.container.innerHTML = `
      <style>
        .modal-card {
          background: #111622;
          border: 1px solid rgba(212, 163, 89, 0.4);
          border-radius: 16px;
          max-width: 920px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.7);
        }

        .modal-body {
          display: grid;
          grid-template-columns: 1fr;
          overflow-y: auto;
          flex-grow: 1;
        }

        @media (min-width: 720px) {
          .modal-body {
            grid-template-columns: 1.1fr 1fr;
          }
        }

        .modal-preview-col {
          background: radial-gradient(circle at center, #1b2333 0%, #0d121c 100%);
          position: relative;
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        @media (min-width: 720px) {
          .modal-preview-col {
            border-bottom: none;
            border-right: 1px solid rgba(255,255,255,0.08);
          }
        }

        #inspector-canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
          cursor: grab;
        }

        #inspector-canvas:active {
          cursor: grabbing;
        }

        .modal-info-col {
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .btn-story {
          background: rgba(212, 163, 89, 0.15);
          border: 1px solid rgba(212, 163, 89, 0.5);
          color: #fef0cd;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .btn-story:hover {
          background: rgba(212, 163, 89, 0.25);
          border-color: #d4a359;
        }

        .btn-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.15s ease;
        }

        .btn-modal-close:hover {
          background: rgba(239, 68, 68, 0.8);
          color: #fff;
        }
      </style>

      <div class="modal-card" role="dialog" aria-modal="true">
        <div style="position: relative; display: flex; flex-direction: column; height: 100%;">
          <button class="btn-modal-close" id="btn-close-modal" aria-label="Đóng (Esc)">✕</button>

          <div class="modal-body">
            <!-- Cột trái: Xem tương tác 3D / Ảnh / Video -->
            <div class="modal-preview-col">
              ${
                isModel
                  ? `
                <canvas id="inspector-canvas"></canvas>
                <div style="position: absolute; bottom: 12px; left: 12px; right: 12px; text-align: center; font-size: 12px; color: #94a3b8; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px; pointer-events: none;">
                  ${STRINGS_VI.rotateHint3D}
                </div>
              `
                  : `
                <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                  <div style="font-size: 48px; margin-bottom: 12px;">🖼️</div>
                  <div style="font-size: 18px; font-weight: 600; color: #d4a359;">${STRINGS_VI.waitingContent}</div>
                </div>
              `
              }
            </div>

            <!-- Cột phải: Thông tin chi tiết -->
            <div class="modal-info-col">
              <div>
                <span style="display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #4ade80; background: rgba(74, 222, 128, 0.12); padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-bottom: 6px;">
                  ${STRINGS_VI.viewedBadge}
                </span>
                <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #f8fafc; margin: 0 0 6px 0; line-height: 1.25;">
                  ${exhibit.title}
                </h2>
                <div style="font-size: 14px; color: #cbd5e1; margin-bottom: 4px;">
                  <strong style="color: #d4a359;">${STRINGS_VI.exhibitPeriod}</strong> ${exhibit.period}
                </div>
                <div style="font-size: 14px; color: #cbd5e1;">
                  <strong style="color: #d4a359;">${STRINGS_VI.exhibitOrigin}</strong> ${exhibit.origin}
                </div>
              </div>

              <!-- Thuyết minh chi tiết (Cỡ chữ thân bài >= 16px theo quy tắc AGENTS.md) -->
              <p style="font-size: 16px; line-height: 1.65; color: #e2e8f0; margin: 0; background: rgba(0, 0, 0, 0.2); border-left: 3px solid #d4a359; padding: 12px 14px; border-radius: 0 8px 8px 0;">
                ${exhibit.description}
              </p>

              ${statsHtml}

              <div style="font-size: 13px; color: #94a3b8; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
                <strong>${STRINGS_VI.exhibitSource}</strong> ${exhibit.source}
              </div>

              <button type="button" class="btn-story" id="btn-listen-story">
                ${STRINGS_VI.btnListenStory}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-close-modal')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#btn-listen-story')?.addEventListener('click', () => {
      alert(STRINGS_VI.btnStoryComingSoon);
    });
  }

  // --- Khởi tạo và điều khiển 3D Inspector tương tác xoay và phóng to (F2.4) ---
  private init3DInspector(canvas: HTMLCanvasElement, previewObject: THREE.Object3D): void {
    this.stop3DInspector();

    const width = canvas.clientWidth || 380;
    const height = canvas.clientHeight || 340;

    this.inspectorScene = new THREE.Scene();
    this.inspectorCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
    this.cameraDistance = 4.2;
    this.inspectorCamera.position.set(0, 0, this.cameraDistance);

    this.inspectorRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.inspectorRenderer.setSize(width, height);
    this.inspectorRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ánh sáng cho khung xem
    const ambLight = new THREE.AmbientLight('#ffffff', 0.9);
    this.inspectorScene.add(ambLight);

    const dirLight1 = new THREE.DirectionalLight('#fff2de', 1.8);
    dirLight1.position.set(5, 5, 5);
    this.inspectorScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight('#aed8f2', 0.8);
    dirLight2.position.set(-5, -3, -5);
    this.inspectorScene.add(dirLight2);

    this.inspectorModelGroup = new THREE.Group();
    this.inspectorModelGroup.add(previewObject);
    this.inspectorScene.add(this.inspectorModelGroup);

    this.modelRotation = { x: 0, y: 0 };

    // Lắng nghe chuột kéo xoay
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.inspectorModelGroup) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;

      this.modelRotation.y += dx * 0.01;
      this.modelRotation.x += dy * 0.01;
      this.modelRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.modelRotation.x));

      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Lắng nghe cuộn chuột phóng to/thu nhỏ (Zoom)
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (!this.inspectorCamera) return;
        this.cameraDistance += e.deltaY * 0.003;
        this.cameraDistance = Math.max(1.8, Math.min(8.0, this.cameraDistance));
        this.inspectorCamera.position.z = this.cameraDistance;
      },
      { passive: false }
    );

    // Lắng nghe cảm ứng trên điện thoại (Touch xoay)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1 || !this.inspectorModelGroup) return;
      const dx = e.touches[0].clientX - this.prevMousePos.x;
      const dy = e.touches[0].clientY - this.prevMousePos.y;

      this.modelRotation.y += dx * 0.015;
      this.modelRotation.x += dy * 0.015;

      this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Vòng lặp render inspector
    const animate = () => {
      if (!this.isOpen || !this.inspectorRenderer || !this.inspectorScene || !this.inspectorCamera) {
        return;
      }
      this.inspectorAnimId = requestAnimationFrame(animate);

      if (this.inspectorModelGroup) {
        // Tự xoay nhẹ nếu người dùng không kéo
        if (!this.isDragging) {
          this.modelRotation.y += 0.004;
        }
        this.inspectorModelGroup.rotation.y = this.modelRotation.y;
        this.inspectorModelGroup.rotation.x = this.modelRotation.x;
      }

      this.inspectorRenderer.render(this.inspectorScene, this.inspectorCamera);
    };

    animate();
  }

  private stop3DInspector(): void {
    if (this.inspectorAnimId !== null) {
      cancelAnimationFrame(this.inspectorAnimId);
      this.inspectorAnimId = null;
    }
    if (this.inspectorRenderer) {
      this.inspectorRenderer.dispose();
      this.inspectorRenderer = null;
    }
    this.inspectorScene = null;
    this.inspectorCamera = null;
    this.inspectorModelGroup = null;
  }
}
