/**
 * Chuỗi giao diện tiếng Việt cho Bảo tàng ảo 3D
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
};
