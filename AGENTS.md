# Dự án: Bảo tàng ảo 3D

## Mục tiêu
Website bảo tàng 3D nhiều phòng, có hướng dẫn viên 3D biết kể chuyện và trả lời câu hỏi.
Người dùng: Học sinh, sinh viên, khách tham quan đại chúng. Chạy trên trình duyệt máy tính và điện thoại.

## Công nghệ bắt buộc
- Vite + TypeScript (strict). Three.js cho 3D. HTML/CSS thuần cho giao diện.
- Không thêm React, không thêm thư viện giao diện, không thêm thư viện mới khi chưa hỏi.
- Gọi Gemini chỉ trong api/chat.ts. Khóa đọc từ biến môi trường GEMINI_API_KEY,
  tên mô hình đọc từ GEMINI_MODEL. Không bao giờ đưa khóa vào mã phía trình duyệt hay commit.

## Quy tắc dữ liệu
- Mọi nội dung hiển thị (tên phòng, hiện vật, thuyết minh, câu chuyện, câu đố) đọc từ
  public/data/museum.json theo kiểu trong src/types.ts. Không viết cứng nội dung trong mã.
- Không tự sáng tác sự kiện lịch sử, niên đại, số liệu, tên hiện vật. Thiếu dữ liệu thì để
  chữ "[CHỜ NỘI DUNG]" và báo lại.
- Thêm phòng hoặc hiện vật mới phải làm được chỉ bằng cách sửa museum.json.

## Quy tắc giao diện và ngôn ngữ
- Toàn bộ chữ trên giao diện là tiếng Việt có dấu, gom trong src/ui/strings.vi.ts.
- Phông chữ phải hỗ trợ tiếng Việt. Cỡ chữ thân bài tối thiểu 16px.
- Mọi lời nói của hướng dẫn viên đều có phụ đề. Mọi nút đều dùng được bằng bàn phím.

## Hiệu năng
- Mục tiêu 30 khung hình/giây trên điện thoại tầm trung. Chỉ tải phòng khi khách bước vào,
  giải phóng phòng cũ khi rời đi.
- Ảnh hiện vật tối đa 2048px. Mô hình .glb tối đa 5 MB mỗi tệp. Tối đa 1 đèn đổ bóng mỗi phòng.

## Cách làm việc
- Mỗi lệnh chỉ làm đúng phạm vi được giao. Không sửa phần đã nghiệm thu khi chưa hỏi.
- Trước khi viết mã: lập Implementation Plan và chờ duyệt.
- Sau khi viết mã: chạy `npm run build`, mở trình duyệt kiểm tra ở khổ 1280px và 400px,
  đính kèm ảnh chụp, liệt kê việc đã làm và việc còn dở.
- Commit sau mỗi giai đoạn đạt nghiệm thu, lời commit bằng tiếng Việt.
