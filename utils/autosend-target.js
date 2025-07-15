const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const filePath = path.join(__dirname, '../data/targets.json');
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');

const loadData = () => JSON.parse(fs.readFileSync(filePath));
const saveData = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function getVietnamNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const d2 = new Date(date2.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

function sortTargets(targets) {
  const now = getVietnamNow();
  return targets.slice().sort((a, b) => {
    const aDue = new Date(a.due);
    const bDue = new Date(b.due);
    const aOver = daysBetween(aDue, now);
    const bOver = daysBetween(bDue, now);

    if (aOver < 0 && bOver < 0) return aOver - bOver;
    if (aOver < 0) return -1;
    if (bOver < 0) return 1;
    return aOver - bOver;
  });
}

function sendMorningTargets(bot) {
  const data = loadData();
  const now = getVietnamNow();

  for (const userId in data) {
    const pending = data[userId].filter(t => !t.done);
    const sorted = sortTargets(pending);
    if (sorted.length === 0) continue;

    const text = sorted.map((t, i) => {
      const due = new Date(t.due);
      const created = new Date(t.created);
      const daysLeft = daysBetween(due, now);
      let note = '';
      if (daysLeft < 0) note = `⏰ Quá hạn ${-daysLeft} ngày`;
      else if (daysLeft === 0) note = `📍 Hết hạn hôm nay`;
      else note = `📅 Còn ${daysLeft} ngày`;

      return `#${i + 1} ${t.goal}\n🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}\n🔖 ${note}`;
    });

    bot.sendMessage(userId, `🌅 Mục tiêu hôm nay của bạn là:\n\n${text.join('\n\n')}`);
  }
}

function sendEveningReminder(bot) {
  const data = loadData();
  for (const userId in data) {
    bot.sendMessage(userId, `🌙 Bạn đã hoàn thành mục tiêu nào hôm nay chưa?\n\nNếu có, hãy dùng lệnh /target done để đánh dấu nhé!`);
  }
}

function sendFinalCheck(bot) {
  const data = loadData();
  const now = getVietnamNow();
  const todayStr = now.toISOString().split('T')[0];

  for (const userId in data) {
    const userTargets = data[userId];
    const doneToday = userTargets.filter(t => t.done && t.done.startsWith(todayStr));

    if (doneToday.length > 0) {
      bot.sendMessage(userId, `✅ Ghi nhận: bạn đã hoàn thành ${doneToday.length} mục tiêu hôm nay! Tuyệt vời 👏\n\nGõ /target list để xem tất cả mục tiêu.`);
    } else {
      const overdue = userTargets.filter(t => {
        if (t.done) return false;
        const due = new Date(t.due);
        const days = daysBetween(due, now);
        return days <= 0; // quá hạn hoặc hết hạn hôm nay
      });

      if (overdue.length === 0) {
        bot.sendMessage(userId, `🌙 Hôm nay bạn chưa hoàn thành mục tiêu nào.\n\nHãy cố gắng hơn vào ngày mai nhé!\n📌 Gõ /target done để đánh dấu khi hoàn thành.`);
        continue;
      }

      const sorted = sortTargets(overdue);
      const text = sorted.map((t, i) => {
        const due = new Date(t.due);
        const created = new Date(t.created);
        const daysLeft = daysBetween(due, now);
        let note = daysLeft < 0 ? `⏰ Quá hạn ${-daysLeft} ngày` : `📍 Hết hạn hôm nay`;

        return `#${i + 1} ${t.goal}\n🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}\n🔖 ${note}`;
      });

      bot.sendMessage(userId, `🌙 Hôm nay bạn chưa hoàn thành mục tiêu nào. 😞\n\nMột số mục tiêu đã quá hạn:\n\n${text.join('\n\n')}\n\n📌 Đừng nản lòng, ngày mai là một cơ hội mới!\nGõ /target done để đánh dấu nếu bạn đã hoàn thành.`);
    }
  }
}

function startAutoTarget(bot) {
  // 06:00 sáng – gửi danh sách mục tiêu chưa hoàn thành
  schedule.scheduleJob({ hour: 6, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => sendMorningTargets(bot));

  // 23:00 – nhắc nhở người dùng đã hoàn thành mục tiêu chưa
  schedule.scheduleJob({ hour: 23, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => sendEveningReminder(bot));

  // 23:59 – tổng kết, nếu chưa có mục tiêu hoàn thành thì động viên và liệt kê mục tiêu trễ
  schedule.scheduleJob({ hour: 23, minute: 59, tz: 'Asia/Ho_Chi_Minh' }, () => sendFinalCheck(bot));
}

module.exports = {
  startAutoTarget
};
