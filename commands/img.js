const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const Currencies = require('../services/currency');

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const imgDir = path.resolve(__dirname, '../src-api/img');
    const cost = 300;

    // Nếu không có args, hiển thị danh sách category
    if (args.length === 0) {
      const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.json'));
      const categories = files.map(f => f.replace('.json', ''));
      const formatted = categories.map(c => `🔹 ${c}`).join('\n');
      return bot.sendMessage(chatId, `=== 『 Danh sách ảnh 』 ===\n\n${formatted}\n\n👉 Dùng: /img <tên_category>`);
    }

    const category = args[0];
    const filePath = path.join(imgDir, `${category}.json`);
    if (!fs.existsSync(filePath)) return bot.sendMessage(chatId, `❌ Không có category: ${category}`);

    const user = Currencies.getData(userId);
    if (user.money < cost) return bot.sendMessage(chatId, `💸 Bạn cần ${cost}$ để xem ảnh.`);

    const imgList = JSON.parse(fs.readFileSync(filePath));
    const imgURL = imgList[Math.floor(Math.random() * imgList.length)];
    const tempFile = path.join(__dirname, '../cache', `${uuidv4()}.jpg`);

    const downloadImage = async (url, filePath) => {
      try {
        const res = await axios.get(url, {
          responseType: 'stream',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        await new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(filePath);
          res.data.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        return true;
      } catch {
        return false;
      }
    };

    const extractImgurImage = async (pageUrl) => {
      try {
        const page = await axios.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(page.data);
        const imgTag = $('meta[property="og:image"]').attr('content') || $('img.image-placeholder').attr('src');
        return imgTag ? (imgTag.startsWith('http') ? imgTag : 'https:' + imgTag) : null;
      } catch {
        return null;
      }
    };

    try {
      let validURL = imgURL;
      let success = await downloadImage(validURL, tempFile);

      // Nếu lỗi thì thử fallback
      if (!success) {
        const fallbackURL = await extractImgurImage(
          imgURL.replace(/^https?:\/\/i\./, 'https://').replace(/\.(jpg|png|gif|webp)$/i, '')
        );
        if (!fallbackURL) throw new Error(`❌ Không thể truy cập ảnh từ: ${imgURL}`);
        validURL = fallbackURL;
        success = await downloadImage(validURL, tempFile);
        if (!success) throw new Error(`❌ Lỗi khi tải ảnh từ fallback: ${validURL}`);
      }

      const sent = await bot.sendPhoto(chatId, fs.createReadStream(tempFile), {
        caption: `📸 Ảnh ${category.toUpperCase()}\n🎯 Tổng ảnh: ${imgList.length}\n💸 -${cost}$\n🔗 ${validURL}`
      });

      fs.unlink(tempFile, () => {});
      Currencies.decreaseMoney(userId, cost);

      // Tự xóa sau 50s
      setTimeout(() => {
        bot.deleteMessage(chatId, sent.message_id).catch(() => {});
      }, 50000);
    } catch (err) {
      console.error('❌ Lỗi khi tải ảnh:', err.message || err);
      bot.sendMessage(chatId, `❌ Lỗi khi tải ảnh từ:\n${imgURL}\n\n📌 Chi tiết: ${err.message || err}`);
    }
  }
};
