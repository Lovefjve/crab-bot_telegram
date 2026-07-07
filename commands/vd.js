const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Currencies = require('../services/currency');

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const videoDir = path.resolve(__dirname, '../src-api/video');
    const cost = 300;

    // Nếu không có args, hiển thị danh sách category
    if (args.length === 0) {
      if (!fs.existsSync(videoDir)) return bot.sendMessage(chatId, `❌ Thư mục video không tồn tại.`);
      const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.json'));
      const categories = files.map(f => f.replace('.json', ''));
      const formatted = categories.map(c => `🔹 ${c}`).join('\n');
      return bot.sendMessage(chatId, `=== 『 Danh sách video 』 ===\n\n${formatted}\n\n👉 Dùng: /vd <tên_category>`);
    }

    const category = args[0].toLowerCase();
    const filePath = path.join(videoDir, `${category}.json`);

    // Kiểm tra category tồn tại (không phân biệt chữ hoa thường đơn giản bằng cách tìm file)
    const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => f.toLowerCase() === `${category}.json`);

    if (!targetFile) return bot.sendMessage(chatId, `❌ Không có category: ${category}`);

    const user = Currencies.getData(userId) || { money: 0 };
    if (user.money < cost) return bot.sendMessage(chatId, `💸 Bạn cần ${cost}$ để xem video.`);

    const videoList = JSON.parse(fs.readFileSync(path.join(videoDir, targetFile)));
    if (!Array.isArray(videoList) || videoList.length === 0) return bot.sendMessage(chatId, `❌ Category ${category} hiện chưa có video.`);

    const videoURL = videoList[Math.floor(Math.random() * videoList.length)].trim();
    const tempDir = path.join(__dirname, '../cache');
    fs.ensureDirSync(tempDir);
    const tempFile = path.join(tempDir, `${uuidv4()}.mp4`);

    const downloadVideo = async (url, filePath) => {
      try {
        const res = await axios.get(url, {
          responseType: 'stream',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 60000 // Tăng timeout cho video
        });
        await new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(filePath);
          res.data.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        return true;
      } catch (err) {
        console.error(`❌ Lỗi tải video: ${err.message}`);
        return false;
      }
    };

    try {
      bot.sendMessage(chatId, `⏳ Đang tải video ${category}...`).then(m => {
        setTimeout(() => bot.deleteMessage(chatId, m.message_id).catch(() => {}), 5000);
      });

      const success = await downloadVideo(videoURL, tempFile);
      if (!success) throw new Error(`❌ Không thể tải video từ: ${videoURL}`);

      const sent = await bot.sendVideo(chatId, fs.createReadStream(tempFile), {
        caption: `🎬 Video ${category.toUpperCase()}\n🎯 Tổng video: ${videoList.length}\n💸 -${cost}$\n🔗 ${videoURL}`
      });

      fs.unlink(tempFile, () => {});
      Currencies.decreaseMoney(userId, cost);

      // Tự xóa sau 50s
      setTimeout(() => {
        bot.deleteMessage(chatId, sent.message_id).catch(() => {});
      }, 50000);
    } catch (err) {
      console.error('❌ Lỗi khi gửi video:', err.message || err);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      bot.sendMessage(chatId, `❌ Lỗi khi xử lý video.\n📌 Chi tiết: ${err.message || err}`);
    }
  }
};
