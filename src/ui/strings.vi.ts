/**
 * Chuỗi giao diện tiếng Việt cho Bảo tàng ảo 3D
 * Toàn bộ chữ trên giao diện gom tại đây theo quy tắc AGENTS.md
 */

export const STRINGS_VI = {
  appTitle: 'Bảo tàng ảo 3D',
  loading: 'Đang tải dữ liệu bảo tàng...',
  errorTitle: 'Đã xảy ra lỗi dữ liệu',
  retry: 'Thử lại',
  lobby: 'Sảnh chính',
  roomListTitle: 'Danh sách phòng trưng bày',
  guideLabel: 'Hướng dẫn viên',
  themeLabel: 'Chủ đề',
  roomCount: (count: number) => `Tổng số phòng: ${count}`,
  exhibitCount: (count: number) => `${count} hiện vật`,
  startExplore: 'Bắt đầu tham quan',
  welcomeBadge: 'Không gian số hóa di sản',
  missingFieldNotice: 'Phát hiện trường dữ liệu bị thiếu hoặc không đúng định dạng:',
  roomSize: (w: number, d: number, h: number) => `${w}m × ${d}m × ${h}m`,
  statusReady: 'Hệ thống đã đọc dữ liệu thành công',

  // Chuỗi cho Lệnh 1: Sảnh chính và điều khiển
  welcomeTitle: 'Chào mừng bạn đến với',
  controlsTitle: 'Hướng dẫn điều khiển',
  controlsPcHeading: 'Trên máy tính (PC):',
  controlsPcMove: 'W, A, S, D hoặc Phím mũi tên: Di chuyển (tiến, lùi, trái, phải)',
  controlsPcRun: 'Giữ phím Shift: Chạy nhanh',
  controlsPcLook: 'Kéo chuột hoặc bấm vào màn hình: Xoay hướng nhìn',
  controlsPcEsc: 'Phím Esc: Tạm dừng / Nhả chuột',
  controlsMobileHeading: 'Trên điện thoại / Cảm ứng:',
  controlsMobileJoystick: 'Cần điều khiển ảo góc trái dưới: Di chuyển',
  controlsMobileLook: 'Vuốt nửa phải màn hình: Xoay hướng nhìn',
  readyToStart: 'Bấm phím Enter, phím Cách (Space) hoặc bấm nút dưới đây để bước vào sảnh:',
  btnStartTour: 'BẮT ĐẦU THAM QUAN',
  paused: 'Tạm dừng - Bấm để tiếp tục',
  crosshairHint: 'Di chuyển mắt nhìn đến các khu vực trong bảo tàng',
};
