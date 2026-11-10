import { loadMuseum, MuseumData, MuseumValidationError } from './types';
import { STRINGS_VI } from './ui/strings.vi';

/**
 * Hiển thị giao diện khi tải dữ liệu thành công
 */
function renderMuseum(data: MuseumData, container: HTMLElement): void {
  const { museum, rooms } = data;
  const totalExhibits = rooms.reduce((acc, r) => acc + (r.exhibits ? r.exhibits.length : 0), 0);

  container.innerHTML = `
    <header class="header">
      <div class="badge">${STRINGS_VI.welcomeBadge}</div>
      <h1 class="museum-title">${museum.name}</h1>
      <p class="museum-welcome">${museum.welcome}</p>
      
      <div class="meta-bar">
        <div class="meta-item">
          👤 <span>${STRINGS_VI.guideLabel}: <strong>${museum.guideName}</strong></span>
        </div>
        <div class="meta-item">
          🏛️ <span>${STRINGS_VI.roomCount(rooms.length)}</span>
        </div>
        <div class="meta-item">
          🏺 <span>${STRINGS_VI.exhibitCount(totalExhibits)}</span>
        </div>
      </div>
    </header>

    <section>
      <div class="section-title">
        <span>${STRINGS_VI.roomListTitle}</span>
      </div>

      <div class="room-grid">
        ${rooms
          .map(
            (room) => `
          <article class="room-card" id="${room.id}">
            <div class="room-header">
              <h2 class="room-name">${room.name}</h2>
              <span class="room-id">${room.id}</span>
            </div>

            <div class="room-theme">✨ ${room.theme}</div>

            <p class="room-intro">${room.intro}</p>

            <div class="room-guide-quote">
              💬 "${room.guideIntro}"
            </div>

            <div class="room-details">
              <div class="detail-tag">
                <span>Kích thước</span>
                <strong>${STRINGS_VI.roomSize(room.size.width, room.size.depth, room.size.height)}</strong>
              </div>
              <div class="detail-tag">
                <span>Phong cách</span>
                <strong>Sàn ${room.style.floor} • Ánh sáng ${room.style.lighting}</strong>
              </div>
              <div class="detail-tag">
                <span>Hiện vật</span>
                <strong>${room.exhibits.length} hiện vật trưng bày</strong>
              </div>
              <div class="detail-tag">
                <span>Trắc nghiệm</span>
                <strong>${room.quiz.length} câu hỏi ôn tập</strong>
              </div>
            </div>

            <div class="exhibit-preview">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em;">Hiện vật tiêu biểu:</span>
              ${room.exhibits
                .map(
                  (ex) => `
                <div class="exhibit-item">
                  • <strong>${ex.title}</strong> (${ex.period})
                </div>
              `
                )
                .join('')}
            </div>
          </article>
        `
          )
          .join('')}
      </div>

      <div class="status-banner">
        <span>✅</span>
        <div>
          <strong>${STRINGS_VI.statusReady}</strong>
          <div>Dữ liệu hợp lệ chuẩn TypeScript theo src/types.ts. Sẵn sàng cho Lệnh 1: Dựng sảnh chính 3D.</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Hiển thị giao diện báo lỗi rõ ràng bằng tiếng Việt khi thiếu trường dữ liệu
 */
function renderError(error: unknown, container: HTMLElement): void {
  let message = 'Đã xảy ra lỗi không xác định khi tải dữ liệu bảo tàng.';
  let fieldNotice = '';

  if (error instanceof MuseumValidationError) {
    message = error.message;
    if (error.fieldPath) {
      fieldNotice = `Đường dẫn trường lỗi: <code>${error.fieldPath}</code>`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  container.innerHTML = `
    <div class="error-card">
      <div class="error-title">
        <span>⚠️</span>
        <span>${STRINGS_VI.errorTitle}</span>
      </div>

      <div class="error-message">${message}</div>

      ${fieldNotice ? `<p style="margin-bottom: 12px; font-size: 14px; color: #fca5a5;">${fieldNotice}</p>` : ''}

      <p class="error-hint">
        <strong>${STRINGS_VI.missingFieldNotice}</strong>
        Vui lòng kiểm tra lại tệp <code>public/data/museum.json</code>. Đảm bảo mọi trường bắt buộc theo đặc tả trong <code>src/types.ts</code> đều được khai báo đầy đủ.
      </p>

      <button class="btn-retry" id="btn-retry">${STRINGS_VI.retry}</button>
    </div>
  `;

  document.getElementById('btn-retry')?.addEventListener('click', () => {
    initApp();
  });
}

/**
 * Khởi tạo ứng dụng
 */
async function initApp(): Promise<void> {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>${STRINGS_VI.loading}</p>
    </div>
  `;

  try {
    const data = await loadMuseum('/data/museum.json');
    renderMuseum(data, appContainer);
  } catch (error) {
    console.error('Lỗi nạp dữ liệu bảo tàng:', error);
    renderError(error, appContainer);
  }
}

// Chạy khởi tạo ngay khi tải xong DOM
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
