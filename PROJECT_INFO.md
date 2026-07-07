# Crab Bot Telegram - Tài liệu tổng quan kỹ thuật

> Mục tiêu: tài liệu hoá dự án để dễ bảo trì, mở rộng và cập nhật tính năng về sau.

## 1) Tổng quan dự án

Đây là Telegram bot viết bằng Node.js, chạy theo cơ chế polling, tổ chức theo kiểu **command-based**:

- Mỗi file trong thư mục `commands/` tương ứng một lệnh Telegram (`/ten_file`).
- `bot.js` tự động load toàn bộ command khi khởi động.
- Dữ liệu được lưu local bằng JSON trong `data/` và `src-api/`.

Bot hiện tập trung vào các nhóm chức năng:

- Kinh tế người dùng (money/exp).
- Điểm danh hằng ngày.
- Quản lý mục tiêu cá nhân.
- Quản lý mã quà tặng (gift code).
- Gửi ảnh/video có tính phí.
- Gửi tin nhắn tự động theo khung giờ.

---

## 2) Công nghệ sử dụng

- Runtime: `Node.js`
- Telegram SDK: `node-telegram-bot-api`
- HTTP client: `axios`
- HTML parser: `cheerio`
- Schedule job: `node-schedule`
- ENV config: `dotenv`
- File utilities: `fs`, `fs-extra`, `path`
- ID tạm: `uuid`

Thông tin script chính (từ `package.json`):

- Start: `node bot.js`
- Entry point: `bot.js`

---

## 3) Cấu trúc thư mục chính

```text
bot.js
commands/
  apivd.js
  autosend.js
  daily.js
  gitcode.js
  img.js
  img3.js
  target.js
services/
  currency.js
  threads.js
utils/
  autosend.js
  autosend-target.js
  isAdmin.js
data/
  admin.json
  code.json
  daily.json
  targets.json
  threads.json
  users.json
src-api/
  img/*.json
  video/douyin.json
cache/
```

---

## 4) Luồng tổng của hệ thống

### 4.1 Luồng khởi động

1. `bot.js` đọc `BOT_TOKEN` từ `.env`.
2. Khởi tạo bot bằng polling.
3. Quét thư mục `commands/`, `require()` từng file `.js` và map vào object `commands` theo tên file.
4. Khởi chạy autosend:
   - `utils/autosend.startAutoSend(bot)`
   - `utils/autosend-target.startAutoTarget(bot)`

### 4.2 Luồng xử lý lệnh slash

Regex bắt lệnh: `/command args...`

1. Tách `command` và `args`.
2. Nếu command tồn tại trong map:
   - ưu tiên gọi `cmd.run({ bot, msg, args })`.
   - nếu command export function trực tiếp thì gọi function đó.
3. Bắt lỗi bằng `try/catch` và gửi tin báo lỗi về chat.

### 4.3 Luồng xử lý tin nhắn thường

Với tin nhắn không bắt đầu bằng `/`:

1. Nếu là reply liên quan target (`done`/`del`) thì gọi `commands['target'].run(...)` tương ứng.
2. Đồng thời chuyển text cho `commands['gitcode'].handleEvent(...)` để nhận code nhập tự do.

---

## 5) Chức năng và luồng chi tiết

## 5.1 `/id` (trong `bot.js`)

- Trả về Telegram user id của người gọi lệnh.

### Luồng
1. Nhận `/id`.
2. Lấy `msg.from.id` và `first_name`.
3. Gửi tin nhắn chứa user ID.

---

## 5.2 `/daily` (file `commands/daily.js`)

- Điểm danh mỗi ngày 1 lần.
- Reward mặc định: `+5000 money`, `+100 exp`.

### Luồng
1. Đọc `data/daily.json` để kiểm tra `lastClaim` theo ngày `vi-VN`.
2. Nếu đã claim hôm nay => báo đã điểm danh.
3. Nếu chưa:
   - cập nhật `lastClaim`, tăng `streak`.
   - cập nhật tiền/exp qua `services/currency`.
4. Gửi thông báo thành công.

---

## 5.3 `/gitcode` + nhập code thường (file `commands/gitcode.js`)

### Nhóm chức năng
- Admin tạo code theo format `code/so_luot/so_tien`.
- Admin xem list code (`/gitcode list`).
- User nhập code bằng cách gửi tin nhắn thường đúng key.

### Luồng tạo/list code
1. Kiểm tra admin trong `data/admin.json`.
2. `list`: chỉ admin mới xem được.
3. Tạo code:
   - validate format.
   - kiểm tra trùng key.
   - lưu vào `data/code.json` dạng `{ key, number, money, user: [] }`.

### Luồng nhập code (`handleEvent`)
1. Bắt tin nhắn thường (không phải slash).
2. So khớp text với `key` trong `code.json`.
3. Nếu đã nhập trước đó => chặn.
4. Nếu hợp lệ:
   - cộng tiền user.
   - thêm user vào danh sách đã dùng code.
   - giảm `number`.
   - nếu hết lượt thì xoá code.

---

## 5.4 `/target` (file `commands/target.js`)

### Nhóm chức năng
- `add`: thêm mục tiêu có deadline.
- `list`: liệt kê mục tiêu, ưu tiên chưa hoàn thành.
- `done`: đánh dấu hoàn thành qua cơ chế reply số thứ tự.
- `del`: xoá mục tiêu qua cơ chế reply số thứ tự.

### Luồng `add`
1. Parse format: `/target add noi_dung|dd/mm/yyyy`.
2. Validate ngày và không cho đặt ngày quá khứ.
3. Lưu vào `data/targets.json` với fields:
   - `goal`, `created`, `due`, `done`.

### Luồng `list`
1. Sort mục tiêu theo trạng thái và thời hạn.
2. Tính trạng thái hiển thị: còn ngày, hết hạn hôm nay, quá hạn, hoàn thành sớm/trễ/đúng hạn.
3. Lưu danh sách vào `sessionLists` (theo chatId) để phục vụ thao tác reply số.

### Luồng `done` / `del`
1. Bot gửi danh sách đánh số.
2. Người dùng reply bằng số thứ tự.
3. Bot map số thứ tự sang bản ghi thật trong dữ liệu.
4. Thực hiện đánh dấu hoàn thành hoặc xoá.

---

## 5.5 `/img` (file `commands/img.js`)

- Gửi 1 ảnh theo category từ `src-api/img/*.json`.
- Có trừ tiền: `300`/ảnh.
- Tự xoá tin nhắn sau `50s`.

### Luồng
1. Nếu chưa truyền category => trả danh sách category.
2. Validate category file tồn tại.
3. Kiểm tra số dư user.
4. Random 1 URL ảnh trong file JSON.
5. Tải ảnh về `cache/*.jpg`.
6. Nếu tải lỗi: fallback parse trang Imgur bằng `cheerio`.
7. Gửi ảnh + caption.
8. Trừ tiền user, xoá file tạm, lên lịch thu hồi tin nhắn.

---

## 5.6 `/img3` (file `commands/img3.js`)

- Tương tự `/img` nhưng gửi tối đa 3 ảnh/lần.
- Phí: `200` cho mỗi ảnh gửi thành công.
- Tự xoá media sau `60s`.

### Luồng
1. Validate category + số dư tối thiểu.
2. Random 3 URL không trùng.
3. Tải từng ảnh, fallback Imgur nếu lỗi.
4. Tạo `mediaGroup` và gửi bằng `sendMediaGroup`.
5. Trừ tiền theo số ảnh gửi được thực tế.
6. Gửi tin nhắn tổng kết chi phí.
7. Dọn file tạm + thu hồi tin nhắn media.

---

## 5.7 `/apivd` (file `commands/apivd.js`)

- Lấy video từ API: `https://api.kuleu.com/api/MP4_xiaojiejie`.
- Trừ tiền: `300`.
- Lưu URL vào `src-api/video/douyin.json` **dạng mảng chuỗi** nếu chưa có.
- Tự xoá tin nhắn video sau `50s`.

### Luồng
1. Kiểm tra số dư.
2. Gọi API lấy URL video (hỗ trợ JSON/string/redirect fallback).
3. Validate tìm được `videoUrl`.
4. Đọc `src-api/video/douyin.json`:
   - chuẩn hoá thành mảng chuỗi.
   - nếu đã tồn tại URL => báo trùng và dừng.
5. Nếu chưa có: push URL mới và ghi file.
6. Tải video vào `cache/*.mp4`.
7. Gửi video + caption.
8. Trừ tiền, xoá file tạm, thu hồi tin nhắn sau 50s.

---

## 5.8 `/autosend` (file `commands/autosend.js`)

- Bật/tắt tin nhắn tự động cho:
  - user cá nhân (`services/currency`).
  - group (`services/threads`).

### Luồng
1. Xác định chat hiện tại là group hay private.
2. Lấy trạng thái hiện tại `autosend`.
3. Nếu không có tham số hoặc sai tham số => trả hướng dẫn `on/off`.
4. Ghi trạng thái mới vào store tương ứng.

---

## 6) Luồng tác vụ tự động (utils)

## 6.1 `utils/autosend.js`

- Chạy vòng lặp mỗi 1 giây, so khớp `HH:mm:ss` theo giờ VN.
- Các mốc gửi mặc định: 06:00, 10:00, 12:00, 14:00, 17:00, 19:00.
- Gửi cho toàn bộ user + group đã bật autosend.

### Luồng
1. Lấy giờ VN hiện tại.
2. Chống gửi trùng cùng giây bằng `lastTime`.
3. Nếu trùng một mốc trong danh sách messages:
   - lấy IDs từ `currency.getAllUsersEnabled()` + `threads.getAllEnabled()`.
   - gửi broadcast từng ID.

## 6.2 `utils/autosend-target.js`

Dùng `node-schedule` với timezone `Asia/Ho_Chi_Minh`:

- `06:00`: gửi danh sách target chưa hoàn thành.
- `23:00`: nhắc người dùng đánh dấu hoàn thành.
- `23:59`: tổng kết ngày, động viên + liệt kê mục tiêu quá hạn nếu cần.

---

## 7) Data model (JSON)

## 7.1 `data/users.json`

```json
{
  "<userId>": {
    "money": 1000,
    "exp": 0,
    "autosend": false
  }
}
```

## 7.2 `data/threads.json`

```json
{
  "<chatId>": {
    "autosend": false
  }
}
```

## 7.3 `data/daily.json`

```json
{
  "<userId>": {
    "lastClaim": "dd/mm/yyyy",
    "streak": 1
  }
}
```

## 7.4 `data/code.json`

```json
[
  {
    "key": "abc",
    "number": 10,
    "money": 1000,
    "user": [{ "userID": 123 }]
  }
]
```

## 7.5 `data/targets.json`

```json
{
  "<userId>": [
    {
      "goal": "...",
      "created": "ISO",
      "due": "ISO",
      "done": null
    }
  ]
}
```

## 7.6 `src-api/video/douyin.json`

```json
[
  "https://i.imgur.com/2bgfxp3.mp4",
  "https://i.imgur.com/7RHMuFO.mp4"
]
```

---

## 8) Quy ước mở rộng tính năng (để cập nhật sau này)

Khi thêm command mới, nên theo checklist:

1. Tạo file `commands/<name>.js` và export `run({ bot, msg, args })`.
2. Nếu cần bắt text thường (non-slash), bổ sung `handleEvent` và gọi tại `bot.js`.
3. Nếu có thu phí, dùng `services/currency` để kiểm tra/trừ tiền.
4. Nếu có lưu dữ liệu, tạo JSON tương ứng trong `data/` hoặc `src-api/`.
5. Nếu gửi media tạm, luôn dọn file trong `cache/`.
6. Nếu cần tin tự động theo giờ, đặt trong `utils/` và gọi từ `bot.js`.

---

## 9) Ghi chú vận hành

- Bot đang dùng polling (không webhook).
- Dữ liệu JSON phù hợp quy mô nhỏ/vừa; nếu mở rộng lớn nên cân nhắc DB (SQLite/PostgreSQL).
- Một số API media bên ngoài có thể không ổn định; đã có fallback ở một số command (`img`, `img3`, `apivd`).

---

## 10) Lịch sử cập nhật tài liệu

- Cập nhật gần nhất: theo trạng thái code hiện tại trên nhánh `master`.
- Khi đổi logic trong `commands/`, `services/`, `utils/`, cần cập nhật lại file này để đồng bộ.
