const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/targets.json');
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');

const loadData = () => JSON.parse(fs.readFileSync(filePath));
const saveData = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

function parseDate(str) {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const d2 = new Date(date2.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

function getVietnamNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

function sortTargets(targets) {
  const now = getVietnamNow();
  return targets.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const dueA = new Date(a.due);
    const dueB = new Date(b.due);
    const leftA = daysBetween(dueA, now);
    const leftB = daysBetween(dueB, now);
    return leftA - leftB;
  });
}

const sessionLists = new Map();

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const data = loadData();
    if (!data[userId]) data[userId] = [];

    const command = args[0];

    if (command === 'add') {
      const rest = args.slice(1).join(' ');
      const lastPipeIndex = rest.lastIndexOf('|');
      if (lastPipeIndex === -1) return bot.sendMessage(chatId, '❗ Dùng: /target add [nội_dung]|[dd/mm/yyyy]');

      const goal = rest.slice(0, lastPipeIndex).trim();
      const dateStr = rest.slice(lastPipeIndex + 1).trim();
      if (!goal || !dateStr) return bot.sendMessage(chatId, '❗ Dùng: /target add [nội_dung]|[dd/mm/yyyy]');

      const date = parseDate(dateStr);
      if (!date || isNaN(date)) return bot.sendMessage(chatId, '❌ Ngày không hợp lệ. Dùng định dạng dd/mm/yyyy.');

      const nowVN = getVietnamNow();
      const todayVN = new Date(Date.UTC(nowVN.getFullYear(), nowVN.getMonth(), nowVN.getDate()));
      if (date < todayVN) return bot.sendMessage(chatId, '⚠️ Không thể đặt mục tiêu ở ngày đã qua.');

      data[userId].push({
        goal,
        created: getVietnamNow().toISOString(),
        due: date.toISOString(),
        done: null
      });

      saveData(data);
      return bot.sendMessage(chatId, '✅ Đã thêm mục tiêu mới.');
    }

    const now = getVietnamNow();

    if (command === 'list') {
      const list = sortTargets(data[userId]);
      if (list.length === 0) return bot.sendMessage(chatId, '📭 Bạn chưa có mục tiêu nào.');

      const lines = list.map((t, i) => {
        const due = new Date(t.due);
        const created = new Date(t.created);
        const daysLeft = daysBetween(due, now);
        let note = '';

        if (t.done) {
          const doneDate = new Date(t.done);
          const diff = daysBetween(due, doneDate);
          if (diff > 0) note = `✅ Hoàn thành sớm ${diff} ngày`;
          else if (diff === 0) note = '✅ Hoàn thành đúng hạn';
          else note = `✅ Hoàn thành trễ ${-diff} ngày`;
        } else {
          if (daysLeft < 0) note = `⏰ Quá hạn ${-daysLeft} ngày`;
          else if (daysLeft === 0) note = `📍 Hết hạn hôm nay`;
          else note = `📅 Còn ${daysLeft} ngày`;
        }

        return `#${i + 1} ${t.goal}
🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}
🔖 ${note}`;
      });

      sessionLists.set(chatId, list);
      return bot.sendMessage(chatId, `🎯 Danh sách mục tiêu:

${lines.join('\n\n')}`);
    }

    if (msg.reply_to_message && msg.reply_to_message.text) {
      const replyNumber = parseInt(msg.text.trim());
      if (isNaN(replyNumber)) return;

      const index = replyNumber - 1;
      const session = sessionLists.get(chatId);
      if (!session || index < 0 || index >= session.length) {
        return bot.sendMessage(chatId, '❌ Số thứ tự không hợp lệ.');
      }

      const target = session[index];
      const userTargets = data[userId];
      const realIndex = userTargets.findIndex(t => t.goal === target.goal && t.due === target.due);
      if (realIndex === -1) return bot.sendMessage(chatId, '❌ Không tìm thấy mục tiêu trong dữ liệu.');

      const due = new Date(userTargets[realIndex].due);

      if (command === 'del') {
        const removed = userTargets.splice(realIndex, 1);
        saveData(data);
        let note = '';
        if (removed[0].done) {
          const doneDate = new Date(removed[0].done);
          const diff = daysBetween(due, doneDate);
          if (diff > 0) note = `✅ (Hoàn thành sớm ${diff} ngày)`;
          else if (diff === 0) note = '✅ (Hoàn thành đúng hạn)';
          else note = `✅ (Hoàn thành trễ ${-diff} ngày)`;
        }
        return bot.sendMessage(chatId, `🗑️ Đã xoá mục tiêu: ${removed[0].goal}\n${note}`);
      }

      if (command === 'done') {
        if (userTargets[realIndex].done) return bot.sendMessage(chatId, '✅ Mục tiêu đã hoàn thành trước đó.');
        userTargets[realIndex].done = getVietnamNow().toISOString();
        saveData(data);

        const doneDate = new Date(userTargets[realIndex].done);
        const diff = daysBetween(due, doneDate);
        let note = '';
        if (diff > 0) note = `✅ Hoàn thành sớm ${diff} ngày`;
        else if (diff === 0) note = '✅ Hoàn thành đúng hạn';
        else note = `✅ Hoàn thành trễ ${-diff} ngày`;

        return bot.sendMessage(chatId, `🎉 Đánh dấu hoàn thành: ${userTargets[realIndex].goal}\n${note}`);
      }
    }

    if (command === 'del' || command === 'done') {
      const list = sortTargets(data[userId]).filter(t => command === 'del' || !t.done);
      if (list.length === 0) return bot.sendMessage(chatId, command === 'del' ? '📭 Không có mục tiêu nào để xoá.' : '🎉 Bạn đã hoàn thành tất cả mục tiêu!');

      sessionLists.set(chatId, list);
      const text = list.map((t, i) => {
        const due = new Date(t.due);
        const created = new Date(t.created);
        const daysLeft = daysBetween(due, now);
        let note = '';
        if (t.done) {
          const doneDate = new Date(t.done);
          const diff = daysBetween(due, doneDate);
          if (diff > 0) note = `✅ Hoàn thành sớm ${diff} ngày`;
          else if (diff === 0) note = '✅ Hoàn thành đúng hạn';
          else note = `✅ Hoàn thành trễ ${-diff} ngày`;
        } else {
          if (daysLeft < 0) note = `⏰ Quá hạn ${-daysLeft} ngày`;
          else if (daysLeft === 0) note = `📍 Hết hạn hôm nay`;
          else note = `📅 Còn ${daysLeft} ngày`;
        }

        return `#${i + 1} ${t.goal}
🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}
🔖 ${note}`;
      });

      return bot.sendMessage(chatId, `${command === 'del' ? '🗑️ Mục tiêu hiện có:' : '🎯 Mục tiêu chưa hoàn thành:'}\n\n${text.join('\n\n')}\n\n👉 Reply tin nhắn này với số thứ tự để ${command === 'del' ? 'xoá' : 'đánh dấu hoàn thành'}.`);
    }

    return bot.sendMessage(chatId, '❗ Dùng: /target [add/list/del/done]');
  }
};
