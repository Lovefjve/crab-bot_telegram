const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Khởi tạo bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Load tất cả lệnh từ thư mục commands
const commands = {};
const commandPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandPath).filter(f => f.endsWith('.js'));

for (const file of files) {
  const commandName = path.basename(file, '.js');
  commands[commandName] = require(`./commands/${file}`);
  console.log(`✅ Loaded command: /${commandName}`);
}

// Lắng nghe lệnh có dạng /command args...
bot.onText(/^\/([^\s@]+)(?:\s+(.+))?/, async (msg, match) => {
  const command = match[1];
  const args = match[2] ? match[2].trim().split(/\s+/) : [];

  console.log(`📥 Nhận lệnh: /${command} | Tham số: ${args.join(' ') || 'không có'}`);

  if (commands[command]) {
    try {
      const cmd = commands[command];
      if (typeof cmd.run === 'function') {
        await cmd.run({ bot, msg, args });
      } else if (typeof cmd === 'function') {
        await cmd(bot, msg, args);
      } else {
        bot.sendMessage(msg.chat.id, `⚠️ Lệnh /${command} không đúng định dạng.`);
      }
    } catch (e) {
      console.error(`❌ Lỗi khi xử lý lệnh /${command}:`, e);
      bot.sendMessage(msg.chat.id, `❌ Đã xảy ra lỗi khi xử lý lệnh /${command}`);
    }
  }
});

// Lắng nghe tin nhắn thường (không bắt đầu bằng dấu /)
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  console.log(`📩 Tin nhắn thường nhận được từ chatID ${msg.chat.id}:`, msg.text);

  // Nếu người dùng reply tin nhắn chứa /target del hoặc /target done
  if (msg.reply_to_message && msg.reply_to_message.text) {
    const replyText = msg.reply_to_message.text;
    const lowerReply = replyText.toLowerCase();

    if (lowerReply.includes('đánh dấu hoàn thành') || lowerReply.includes('target done')) {
      const handler = commands['target'];
      if (handler) {
        await handler.run({ bot, msg, args: ['done'] });
        return;
      }
    }

    if (lowerReply.includes('để xoá') || lowerReply.includes('target del')) {
      const handler = commands['target'];
      if (handler) {
        await handler.run({ bot, msg, args: ['del'] });
        return;
      }
    }
  }

  // Nếu là gitcode
  const handler = commands['gitcode']?.handleEvent;
  if (typeof handler === 'function') {
    try {
      const Currencies = require('./services/currency');
      await handler({ bot, msg, Currencies });
    } catch (e) {
      console.error('❌ Lỗi khi xử lý nhập code:', e);
    }
  }
});

// Lệnh tiện ích /id
bot.onText(/^\/id$/, (msg) => {
  const userId = msg.from.id;
  const name = msg.from.first_name || 'User';
  bot.sendMessage(msg.chat.id, `🆔 User ID của bạn là: ${userId} (${name})`);
});

// Tự động gửi tin nhắn lời chào/nhắc nhở
const startAutoSend = require('./utils/autosend');
startAutoSend(bot);

// Tự động nhắc nhở target
const { startAutoTarget } = require('./utils/autosend-target');
startAutoTarget(bot);

// Tự động gửi bản tin sáng (7h) và tối (22h)
const startAutoNews = require('./utils/autonews');
startAutoNews(bot);
