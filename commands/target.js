const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/targets.json');
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');

const loadData = () => JSON.parse(fs.readFileSync(filePath));
const saveData = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

function parseDate(str) {
  const [d, m, y] = str.split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN');
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1.setHours(0, 0, 0, 0));
  const d2 = new Date(date2.setHours(0, 0, 0, 0));
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function sortTargets(targets) {
  const now = new Date();
  return targets.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.due) - new Date(b.due);
  });
}

const sessionLists = new Map(); // Lưu danh sách đã gửi theo chatId

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const data = loadData();
    if (!data[userId]) data[userId] = [];

    const command = args[0];

    // /target add
    if (command === 'add') {
      const input = args.slice(1).join(' ');
      const lastPipe = input.lastIndexOf('|');
      if (lastPipe === -1) return bot.sendMessage(chatId, '❗ Dùng: /target add [mục tiêu]|[dd/mm/yyyy]');

      const goal = input.slice(0, lastPipe).trim();
      const dateStr = input.slice(lastPipe + 1).trim();

      const dueDate = parseDate(dateStr);
      if (!dueDate || isNaN(dueDate)) return bot.sendMessage(chatId, '❌ Ngày không hợp lệ. Dùng định dạng dd/mm/yyyy.');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) return bot.sendMessage(chatId, '⚠️ Không thể đặt mục tiêu ở ngày đã qua.');

      data[userId].push({
        goal,
        created: new Date().toISOString(),
        due: dueDate.toISOString(),
        done: false
      });
      saveData(data);
      return bot.sendMessage(chatId, '✅ Đã thêm mục tiêu mới.');
    }

    // /target list
    if (command === 'list') {
      const list = sortTargets(data[userId]);
      if (!list.length) return bot.sendMessage(chatId, '📭 Bạn chưa có mục tiêu nào.');

      const now = new Date();
      const output = list.map((t, i) => {
        const created = new Date(t.created);
        const due = new Date(t.due);
        let note = '';

        if (t.done) {
          const doneAt = new Date(t.done);
          const diff = daysBetween(due, doneAt);
          if (diff < 0) note = `✅ Đã hoàn thành sớm ${-diff} ngày`;
          else if (diff === 0) note = `✅ Hoàn thành đúng hạn`;
          else note = `✅ Hoàn thành trễ ${diff} ngày`;
        } else {
          const diff = daysBetween(now, due);
          if (diff < 0) note = `⏰ Quá hạn ${-diff} ngày`;
          else if (diff === 0) note = `📍 Hết hạn hôm nay`;
          else note = `📅 Còn ${diff} ngày`;
        }

        return `#${i + 1} ${t.goal}
🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}
🔖 ${note}`;
      });

      sessionLists.set(chatId, list);
      return bot.sendMessage(chatId, `🎯 Danh sách mục tiêu:

${output.join('\n\n')}`);
    }

    // Handle reply message
    if (msg.reply_to_message && msg.reply_to_message.text) {
      const replyIndex = parseInt(msg.text.trim());
      if (isNaN(replyIndex)) return;

      const session = sessionLists.get(chatId);
      if (!session || !session[replyIndex - 1]) return bot.sendMessage(chatId, '❌ Số thứ tự không hợp lệ.');

      const target = session[replyIndex - 1];
      const realIndex = data[userId].findIndex(t => t.goal === target.goal && t.due === target.due);

      if (realIndex === -1) return bot.sendMessage(chatId, '❌ Không tìm thấy mục tiêu.');

      if (command === 'done') {
        if (data[userId][realIndex].done) return bot.sendMessage(chatId, '✅ Mục tiêu đã hoàn thành.');
        data[userId][realIndex].done = new Date().toISOString();
        saveData(data);

        const doneAt = new Date(data[userId][realIndex].done);
        const due = new Date(data[userId][realIndex].due);
        const diff = daysBetween(due, doneAt);
        let note = diff === 0 ? '✅ Hoàn thành đúng hạn'
          : diff < 0 ? `✅ Đã hoàn thành sớm ${-diff} ngày`
          : `✅ Hoàn thành trễ ${diff} ngày`;

        return bot.sendMessage(chatId, `🎉 Đã đánh dấu hoàn thành: ${target.goal}\n${note}`);
      }

      if (command === 'del') {
        const removed = data[userId].splice(realIndex, 1);
        saveData(data);

        const due = new Date(removed[0].due);
        const created = new Date(removed[0].created);
        const now = new Date();
        let note = '';

        if (removed[0].done) {
          const doneAt = new Date(removed[0].done);
          const diff = daysBetween(due, doneAt);
          if (diff < 0) note = `✅ Đã hoàn thành sớm ${-diff} ngày`;
          else if (diff === 0) note = `✅ Hoàn thành đúng hạn`;
          else note = `✅ Hoàn thành trễ ${diff} ngày`;
        } else {
          const diff = daysBetween(now, due);
          if (diff < 0) note = `⏰ Quá hạn ${-diff} ngày`;
          else if (diff === 0) note = `📍 Hết hạn hôm nay`;
          else note = `📅 Còn ${diff} ngày`;
        }

        return bot.sendMessage(chatId, `🗑️ Đã xoá: ${removed[0].goal}\n🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}\n🔖 ${note}`);
      }
    }

    // /target del
    if (command === 'del') {
      const list = sortTargets(data[userId]);
      if (!list.length) return bot.sendMessage(chatId, '📭 Không có mục tiêu để xoá.');

      const text = list.map((t, i) => {
        const due = new Date(t.due);
        const created = new Date(t.created);
        const now = new Date();
        let note = '';

        if (t.done) {
          const doneAt = new Date(t.done);
          const diff = daysBetween(due, doneAt);
          if (diff < 0) note = `✅ Đã hoàn thành sớm ${-diff} ngày`;
          else if (diff === 0) note = `✅ Hoàn thành đúng hạn`;
          else note = `✅ Hoàn thành trễ ${diff} ngày`;
        } else {
          const diff = daysBetween(now, due);
          if (diff < 0) note = `⏰ Quá hạn ${-diff} ngày`;
          else if (diff === 0) note = `📍 Hết hạn hôm nay`;
          else note = `📅 Còn ${diff} ngày`;
        }

        return `#${i + 1} ${t.goal}
🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}
🔖 ${note}`;
      });

      sessionLists.set(chatId, list);
      return bot.sendMessage(chatId, `🗑️ Mục tiêu hiện có:

${text.join('\n\n')}

👉 Reply tin nhắn này với số để xoá.`);
    }

    // /target done
    if (command === 'done') {
      const list = sortTargets(data[userId]).filter(t => !t.done);
      if (!list.length) return bot.sendMessage(chatId, '🎉 Bạn đã hoàn thành tất cả mục tiêu!');

      const text = list.map((t, i) => {
        const due = new Date(t.due);
        const created = new Date(t.created);
        const daysLeft = daysBetween(new Date(), due);
        const note = daysLeft < 0
          ? `⏰ Quá hạn ${-daysLeft} ngày`
          : daysLeft === 0
          ? `📍 Hết hạn hôm nay`
          : `📅 Còn ${daysLeft} ngày`;
        return `#${i + 1} ${t.goal}
🔹 Bắt đầu: ${formatDate(created)} | 🎯 Hạn: ${formatDate(due)}
🔖 ${note}`;
      });

      sessionLists.set(chatId, list);
      return bot.sendMessage(chatId, `🎯 Mục tiêu chưa hoàn thành:

${text.join('\n\n')}

👉 Reply tin nhắn này với số để đánh dấu hoàn thành.`);
    }

    return bot.sendMessage(chatId, '❗ Dùng: /target [add/list/del/done]');
  }
};
