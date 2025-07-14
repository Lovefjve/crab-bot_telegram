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
    const costPerImage = 200;
    const imageCount = 3;
    const maxLifetime = 60 * 1000; // 60 giây

    if (args.length === 0) {
      const files = fs.readdirSync(imgDir);
      const categories = files.map(f => f.replace('.json', ''));
      const formatted = categories.map(c => `🔹 ${c}`).join('\n');
      return bot.sendMessage(chatId, `=== 『 Danh sách ảnh 』 ===\n\n${formatted}\n\n👉 Dùng: /img3 <tên_category>`);
    }

    const category = args[0];
    const filePath = path.join(imgDir, `${category}.json`);
    if (!fs.existsSync(filePath)) return bot.sendMessage(chatId, `❌ Không có category: ${category}`);

    const user = Currencies.getData(userId);
    if (user.money < costPerImage) return bot.sendMessage(chatId, `💸 Bạn cần ít nhất ${costPerImage}$ để xem ảnh.`);

    const imgList = JSON.parse(fs.readFileSync(filePath));
    const selectedImages = [];

    while (selectedImages.length < imageCount) {
      const img = imgList[Math.floor(Math.random() * imgList.length)];
      if (!selectedImages.includes(img)) selectedImages.push(img);
    }

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
        const page = await axios.get(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(page.data);
        const imgTag = $('meta[property="og:image"]').attr('content') || $('img.image-placeholder').attr('src');
        return imgTag?.startsWith('http') ? imgTag : imgTag ? 'https:' + imgTag : null;
      } catch {
        return null;
      }
    };

    const mediaGroup = [];
    const filePaths = [];
    const validURLs = [];

    for (const url of selectedImages) {
      const tempFile = path.join(__dirname, '../cache', `${uuidv4()}.jpg`);
      let validURL = url;
      let success = await downloadImage(validURL, tempFile);

      if (!success) {
        const fallbackURL = await extractImgurImage(
          url.replace(/^https?:\/\/i\./, 'https://').replace(/\.(jpg|png|gif|webp)$/i, '')
        );
        if (fallbackURL) {
          validURL = fallbackURL;
          success = await downloadImage(validURL, tempFile);
        }
      }

      if (success) {
        mediaGroup.push({
          type: 'photo',
          media: fs.createReadStream(tempFile),
          caption: `📸 ${category.toUpperCase()}\n🔗 ${validURL}`
        });
        filePaths.push(tempFile);
        validURLs.push(validURL);
      } else {
        await bot.sendMessage(chatId, `❌ Lỗi khi tải ảnh từ:\n${url}`);
      }
    }

    if (mediaGroup.length > 0) {
      const sentMessages = await bot.sendMediaGroup(chatId, mediaGroup);
      const totalCost = mediaGroup.length * costPerImage;
      Currencies.decreaseMoney(userId, totalCost);

      // Thông báo chi tiết
      await bot.sendMessage(chatId, `🧾 Bạn đã xem ${mediaGroup.length} ảnh.\n💸 Đã trừ ${totalCost}$`);

      // Tự xoá ảnh sau 60 giây
      setTimeout(() => {
        sentMessages.forEach(msg => {
          bot.deleteMessage(chatId, msg.message_id).catch(() => {});
        });
      }, maxLifetime);
    } else {
      bot.sendMessage(chatId, `❌ Không gửi được ảnh nào.`);
    }

    // Dọn dẹp file
    filePaths.forEach(file => fs.unlink(file, () => {}));
  }
};
