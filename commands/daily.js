const fs = require('fs');
const path = require('path');
const Currencies = require('../services/currency');

const dailyFile = path.join(__dirname, '../data/daily.json');
if (!fs.existsSync(dailyFile)) fs.writeFileSync(dailyFile, '{}');

module.exports = {
  run: async ({ bot, msg }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const today = new Date().toLocaleDateString('vi-VN');
    const reward = { money: 5000, exp: 100 };

    const data = JSON.parse(fs.readFileSync(dailyFile));
    const user = data[userId] || {};

    if (user.lastClaim === today) {
      return bot.sendMessage(chatId, `✅ Bạn đã điểm danh hôm nay rồi.`);
    }

    user.lastClaim = today;
    user.streak = (user.streak || 0) + 1;
    data[userId] = user;
    fs.writeFileSync(dailyFile, JSON.stringify(data, null, 2));

    const current = Currencies.getData(userId);
    Currencies.setData(userId, {
      money: current.money + reward.money,
      exp: current.exp + reward.exp
    });

    bot.sendMessage(chatId, `🎉 Điểm danh thành công!\n💸 +${reward.money}$\n✨ +${reward.exp} exp\n🔥 Chuỗi ngày: ${user.streak}`);
  }
};
