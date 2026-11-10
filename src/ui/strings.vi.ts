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

  // Chuỗi cho Lệnh 2: Các phòng dựng từ dữ liệu & Chuyển cảnh
  doorToRoom: (name: string) => `Cửa vào: ${name}`,
  doorReturnLobby: 'Lối về Sảnh chính',
  doorPrompt: 'Bước qua cửa để chuyển phòng',
  minimapTitle: 'Bản đồ bảo tàng',
  currentLocation: 'Vị trí hiện tại',
  fastTravel: 'Chuyển nhanh đến phòng',
  roomIntroTitle: 'Giới thiệu không gian trưng bày',
  roomIntroTheme: 'Chủ đề',
  roomIntroExhibits: 'Quy mô trưng bày',
  closeBtn: 'Đóng (Esc)',
  navLobby: '🏛️ Sảnh chính',

  // Chuỗi cho Lệnh 3: Hiện vật và bảng thông tin
  interactPromptKey: 'Nhấn [E] hoặc chạm để xem chi tiết',
  interactPromptSummary: 'Hiện vật trưng bày',
  exhibitPeriod: 'Niên đại / Vị trí:',
  exhibitOrigin: 'Xuất xứ:',
  exhibitSource: 'Nguồn tư liệu:',
  exhibitStatsTitle: 'Thông số khoa học:',
  btnListenStory: '🎙️ Nghe kể chuyện',
  btnStoryComingSoon: 'Tính năng kể chuyện sẽ được kích hoạt tại Lệnh 6',
  waitingContent: '[CHỜ NỘI DUNG]',
  roomProgressLabel: 'Tiến độ phòng',
  exhibitsViewedProgress: (viewed: number, total: number) => `Đã xem ${viewed}/${total} hiện vật`,
  rotateHint3D: 'Kéo chuột để xoay 360° • Cuộn chuột để phóng to/thu nhỏ',
  viewedBadge: '✓ ĐÃ XEM',

  // Chuỗi cho Lệnh 4: Hướng dẫn viên 3D (F3.1 - F3.4)
  guideRole: 'Hướng dẫn viên',
  btnSkipSpeech: 'Bỏ qua [S]',
  btnMuteSpeech: 'Tắt tiếng [M]',
  btnUnmuteSpeech: 'Bật tiếng [M]',
  speechMutedNotice: 'Đã tắt tiếng (chỉ hiện phụ đề)',
  speechUnmutedNotice: 'Đã bật tiếng',
};
