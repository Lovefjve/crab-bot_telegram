const fs = require('fs');
const path = require('path');
const Currencies = require('../services/currency');

const codePath = path.join(__dirname, '../data/code.json');
const adminPath = path.join(__dirname, '../data/admin.json');
if (!fs.existsSync(codePath)) fs.writeFileSync(codePath, '[]');
if (!fs.existsSync(adminPath)) fs.writeFileSync(adminPath, '[]');

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const isAdmin = JSON.parse(fs.readFileSync(adminPath)).includes(userId);
    const data = JSON.parse(fs.readFileSync(codePath));

    if (!args[0]) {
      return bot.sendMessage(chatId, '❗ Dùng: /gitcode list hoặc /gitcode <code>/<số_lượt>/<số_tiền>');
    }

    if (args[0] === 'list') {
      if (!isAdmin) return bot.sendMessage(chatId, '🚫 Bạn không có quyền xem danh sách code.');
      if (data.length === 0) return bot.sendMessage(chatId, '📭 Không có code nào.');

      let text = '📜 Danh sách code:';
      for (const c of data) {
        text += `\n🔑 ${c.key} | 🔁 ${c.number} lượt | 💰 ${c.money}$`;
      }
      return bot.sendMessage(chatId, text);
    }

    // Tạo code mới (admin-only)
    if (!isAdmin) return bot.sendMessage(chatId, '🚫 Bạn không có quyền tạo code.');

    const [key, numStr, moneyStr] = args[0].split('/');
    const number = parseInt(numStr);
    const money = parseInt(moneyStr);

    if (!key || isNaN(number) || isNaN(money)) {
      return bot.sendMessage(chatId, '❌ Sai định dạng! Dùng: <code>/<số_lượt>/<số_tiền>');
    }

    if (data.find(c => c.key === key)) {
      return bot.sendMessage(chatId, '❌ Code này đã tồn tại.');
    }

    data.push({ key, number, money, user: [] });
    fs.writeFileSync(codePath, JSON.stringify(data, null, 2));
    return bot.sendMessage(chatId, `✅ Tạo code thành công!\n🔑 ${key}\n🔁 ${number} lượt\n💸 ${money}$`);
  },

  handleEvent: async ({ bot, msg }) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text?.trim()?.toLowerCase();
    if (!text || text.startsWith('/')) return;

    let data = JSON.parse(fs.readFileSync(codePath));
    const found = data.find(c => c.key === text);
    if (!found) return;

    if (found.user.some(u => u.userID === userId)) {
      return bot.sendMessage(chatId, '🚫 Bạn đã nhập code này rồi.');
    }

    const user = Currencies.getData(userId);
    Currencies.setData(userId, { money: user.money + found.money });

    found.user.push({ userID: userId });
    found.number--;

    if (found.number <= 0) {
      data = data.filter(c => c.key !== found.key);
      bot.sendMessage(chatId, `🔒 Code \"${found.key}\" đã hết lượt và bị xoá.`);
    }

    fs.writeFileSync(codePath, JSON.stringify(data, null, 2));
    bot.sendMessage(chatId, `🎉 Nhập code thành công!\n💵 Bạn nhận được ${found.money}$`);
  }
};
