# Crab Bot Telegram

Bot Telegram viết bằng Node.js theo kiến trúc command-based, hỗ trợ giải trí, quản lý mục tiêu và tin tức tự động.

## Tài liệu chính

- Xem tài liệu kỹ thuật đầy đủ tại: [`PROJECT_INFO.md`](./PROJECT_INFO.md)

## Chức năng nổi bật

- **Tin tức & Podcast cá nhân**: Tự động tổng hợp tin tức nóng hổi và chuyển thành giọng nói (TTS). Gửi vào 7:00 sáng và 22:00 tối mỗi ngày.
- **Giải trí**: Xem ảnh/video ngẫu nhiên theo category (Gái, Anime, Douyin...).
- **Tiện ích**: Quản lý mục tiêu (Target), Điểm danh (Daily), Nhận mã quà tặng (Giftcode).
- **Tự động hóa**: Nhắc nhở mục tiêu và gửi tin nhắn quan tâm định kỳ.

## Chạy dự án

```bash
npm install
npm start
```

## Ghi chú

- Entry point: `bot.js`
- Các lệnh nằm trong thư mục `commands/`
- Dữ liệu local nằm trong `data/` và `src-api/`
