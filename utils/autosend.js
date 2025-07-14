const { getAllUsersEnabled } = require('../services/currency');
const { getAllEnabled: getGroupsEnabled } = require('../services/threads');

const messages = [
  { time: '06:00:00', text: '🌅 Chúc bạn buổi sáng vui vẻ!' },
  { time: '10:00:00', text: '🍚 Đã 10h, nhớ bật nồi cơm nhé!' },
  { time: '12:00:00', text: '🍴 Trưa rồi, nghỉ ngơi nào!' },
  { time: '14:00:00', text: '☕ Chúc buổi chiều vui vẻ 💝' },
  { time: '17:00:00', text: '🍱 Cơm tối gần tới giờ rồi 😻' },
  { time: '19:00:00', text: '🌙 Buổi tối tốt lành nhé 💕' },
];

// Lấy giờ theo múi giờ Việt Nam (UTC+7)
function getCurrentTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vn = new Date(utc + 7 * 3600000);
  return vn.toTimeString().split(' ')[0];
}

let lastTime = ''; // để tránh gửi nhiều lần trong cùng một giây

function startAutoSend(bot) {
  setInterval(() => {
    const now = getCurrentTime().slice(0, 8); // chỉ lấy HH:mm:ss
    if (now === lastTime) return; // tránh gửi trùng trong vòng lặp
    lastTime = now;

    const found = messages.find(m => m.time === now);
    if (!found) return;

    const users = getAllUsersEnabled();
    const groups = getGroupsEnabled();
    const text = `🕒 Bây giờ là ${found.time}\n\n${found.text}\n\n» » Đây là tin nhắn tự động « « \n/autosend off để tắt\n\nฅ⁠^⁠•⁠ﻌ⁠•⁠^⁠ฅ___Lovefjve___ฅ⁠^⁠•⁠ﻌ⁠•⁠^⁠ฅ`;

    [...users, ...groups].forEach(id => {
      bot.sendMessage(id, text).catch(err =>
        console.error(`❌ Không gửi được cho ${id}:`, err.message)
      );
    });
  }, 1000);
}

module.exports = startAutoSend;
