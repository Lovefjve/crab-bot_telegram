# Crab Bot Telegram - Tài liệu tổng quan kỹ thuật

> Mục tiêu: tài liệu hoá dự án để dễ bảo trì, mở rộng và cập nhật tính năng về sau.

## 1) Tổng quan dự án

Đây là Telegram bot viết bằng Node.js, chạy theo cơ chế polling, tổ chức theo kiểu **command-based**:

- Mỗi file trong thư mục `commands/` tương ứng một lệnh Telegram (`/ten_file`).
- `bot.js` tự động load toàn bộ command khi khởi động.
- Dữ liệu được lưu local bằng JSON trong `data/` và `src-api/`.

Bot hiện tập trung vào các nhóm chức năng:

- **Kinh tế & Giải trí**: Money/exp, Điểm danh, Ảnh/Video có phí.
- **Tiện ích & Tự động hóa**: Quản lý mục tiêu, Tin tức & Podcast cá nhân tự động.
- **Quản trị**: Quản lý mã quà tặng (Giftcode).

---

## 2) Công nghệ sử dụng

- Runtime: `Node.js`
- Telegram SDK: `node-telegram-bot-api`
- HTTP client: `axios`
- HTML/XML parser: `cheerio` (dùng cho Scraping và RSS)
- Schedule job: `node-schedule`
- TTS: Google Translate TTS API (miễn phí)
- ENV config: `dotenv`
- File utilities: `fs`, `fs-extra`, `path`
- ID tạm: `uuid`

---

## 3) Cấu trúc thư mục chính

```text
bot.js
commands/
  news.js, vd.js, apivd.js, autosend.js, daily.js, gitcode.js, img.js, img3.js, target.js
services/
  news.js, tts.js, currency.js, threads.js
utils/
  autonews.js, autosend.js, autosend-target.js, isAdmin.js
data/
  users.json, threads.json, daily.json, targets.json, code.json, admin.json
src-api/
  img/*.json
  video/*.json
cache/ (Chứa file ảnh/video/audio tạm thời)
```

---

## 4) Chức năng và luồng chi tiết

### 4.1 `/id` (Tích hợp trong `bot.js`)
- Trả về User ID và tên người dùng. Dùng để cấu hình Admin hoặc kiểm tra ID cá nhân.

### 4.2 `/daily` (Điểm danh)
- Mỗi ngày 1 lần, nhận `+5000$` và `+100 exp`. Có hệ thống tính `streak` (chuỗi ngày).

### 4.3 `/news` (Tin tức & Podcast)
- Lấy 5 tin mới nhất từ VnExpress RSS.
- Sử dụng `services/tts.js` để đọc tóm tắt tin tức.
- Cơ chế TTS tự động chia nhỏ văn bản dài thành các đoạn < 200 ký tự để vượt giới hạn Google API.

### 4.4 `/target` (Quản lý mục tiêu)
- `add`: Thêm mục tiêu + deadline (dd/mm/yyyy).
- `list`: Xem danh sách, tự động phân loại: còn hạn, hết hạn hôm nay, quá hạn.
- `done/del`: Đánh dấu hoàn thành hoặc xóa mục tiêu bằng cách reply số thứ tự.

### 4.5 `/img` & `/img3` (Kho ảnh)
- Lấy 1 hoặc 3 ảnh ngẫu nhiên từ `src-api/img/`.
- Phí: `300$` (1 ảnh) hoặc `200$/ảnh` (với `/img3`).
- Tự động thu hồi (xóa) media sau 50-60 giây.

### 4.6 `/vd` & `/apivd` (Video)
- `/vd`: Lấy video từ kho dữ liệu local (`src-api/video/`).
- `/apivd`: Lấy video từ API bên ngoài và tự động lưu URL mới vào dữ liệu local.
- Phí: `300$`. Tự động xóa sau 50 giây.

### 4.7 `/gitcode` (Mã quà tặng)
- Admin dùng lệnh này để tạo code: `key/luot_nhap/so_tien`.
- User nhập code bằng cách gửi tin nhắn thường chứa mã code đó (xử lý qua `handleEvent`).

### 4.8 `/autosend` (Bật/tắt tự động)
- Cho phép User hoặc Nhóm bật/tắt nhận tin nhắn tự động (Lời chào, Target, Tin tức).

---

## 5) Luồng tác vụ tự động (Utilities)

### 5.1 `utils/autonews.js` (Podcast sáng/tối)
- Chạy vào **07:00** và **22:00** hàng ngày.
- Tự động tổng hợp tin tức và gửi file Voice tóm tắt cho tất cả ID có bật `autosend`.

### 5.2 `utils/autosend.js` (Lời chào định kỳ)
- Gửi các câu chúc/nhắc nhở cơm nước vào các khung giờ: 06:00, 10:00, 12:00, 14:00, 17:00, 19:00.

### 5.3 `utils/autosend-target.js` (Nhắc nhở mục tiêu)
- 06:00: Gửi danh sách việc cần làm trong ngày.
- 23:00: Nhắc nhở kiểm tra mục tiêu chưa hoàn thành.
- 23:59: Tổng kết và động viên.

---

## 6) Quy ước mở rộng tính năng

1. **Command mới**: Tạo trong `commands/`, export hàm `run`.
2. **Dịch vụ mới**: Tạo trong `services/` (VD: AI, Weather).
3. **Dữ liệu**: Luôn ưu tiên lưu vào `data/` (cấu hình) hoặc `src-api/` (nội dung).
4. **Media**: Luôn dọn dẹp file trong `cache/` sau khi gửi để tránh đầy bộ nhớ.

---

## 7) Lịch sử cập nhật tài liệu

- **Cập nhật gần nhất**: Hoàn thiện tài liệu cho toàn bộ các lệnh hiện có.
- **Người thực hiện**: Crab Bot Assistant.
