const { toggleAutoSend, getData } = require('../services/currency');
const threads = require('../services/threads');

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const isGroup = msg.chat.type.endsWith('group');

    const currentStatus = isGroup
      ? threads.getData(chatId).autosend
      : getData(chatId).autosend;

    if (!args[0] || !['on', 'off'].includes(args[0].toLowerCase())) {
      return bot.sendMessage(chatId, `🔁 Tự động gửi tin nhắn đang: ${currentStatus ? 'BẬT ✅' : 'TẮT ❌'}\n👉 Dùng: /autosend on hoặc /autosend off`);
    }

    const status = args[0].toLowerCase() === 'on';

    if (isGroup) {
      threads.toggleAutoSend(chatId, status);
    } else {
      toggleAutoSend(chatId, status);
    }

    bot.sendMessage(chatId, `✅ Đã ${status ? 'bật' : 'tắt'} tự động gửi tin nhắn.`);
  }
};
