const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Currencies = require('../services/currency');

module.exports = {
  run: async ({ bot, msg, args }) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const tempDir = path.join(__dirname, '../cache');
    fs.ensureDirSync(tempDir);
    const tempFile = path.join(tempDir, `${uuidv4()}.mp4`);
    const cost = 300;
    const apiUrl = 'https://api.kuleu.com/api/MP4_xiaojiejie';

    const user = Currencies.getData(userId) || { money: 0 };
    if (user.money < cost) return bot.sendMessage(chatId, `💸 Bạn cần ${cost}$ để xem video.`);

    const downloadStream = async (url, filePath) => {
      try {
        const res = await axios.get(url, {
          responseType: 'stream',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000,
          maxRedirects: 5,
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

    try {
      // Lấy data từ API
      const res = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: null
      });

      let videoUrl = null;
      const ctype = (res.headers && res.headers['content-type']) || '';

      if (ctype.includes('application/json')) {
        const body = res.data;
        if (typeof body === 'string' && /^https?:\/\//.test(body)) videoUrl = body.trim();
        else if (body.url) videoUrl = body.url;
        else if (body.mp4) videoUrl = body.mp4;
        else if (body.data && (body.data.url || body.data.mp4)) videoUrl = body.data.url || body.data.mp4;
        else if (Array.isArray(body) && body.length && (body[0].url || body[0].mp4)) videoUrl = body[0].url || body[0].mp4;
      } else {
        if (typeof res.data === 'string' && /^https?:\/\//.test(res.data.trim())) {
          videoUrl = res.data.trim();
        } else {
          try {
            const head = await axios.head(apiUrl, { maxRedirects: 5, timeout: 10000, validateStatus: null });
            if (head && head.request && head.request.res && head.request.res.responseUrl) {
              videoUrl = head.request.res.responseUrl;
            }
          } catch {
            // ignore
          }
        }
      }

      if (!videoUrl) throw new Error('Không tìm thấy URL video từ API.');

      // Lưu vào src-api/video/douyin.json nếu chưa có (dạng mảng chuỗi)
      const dataPath = path.join(__dirname, '../src-api/video/douyin.json');
      fs.ensureDirSync(path.dirname(dataPath));
      fs.ensureFileSync(dataPath);
      let list = [];
      try {
        const raw = fs.readJsonSync(dataPath);
        if (Array.isArray(raw)) list = raw.map(item => String(item).trim()).filter(Boolean);
      } catch {
        list = [];
      }

      const exists = list.includes(videoUrl);
      if (exists) {
        return bot.sendMessage(chatId, '⚠️ Video này đã tồn tại trong cơ sở dữ liệu. Không gửi lại.');
      }

      // Push chuỗi URL và lưu
      list.push(videoUrl);
      fs.writeJsonSync(dataPath, list, { spaces: 2 });

      // Tải video
      const ok = await downloadStream(videoUrl, tempFile);
      if (!ok) throw new Error('Lỗi khi tải video từ: ' + videoUrl);

      const sent = await bot.sendVideo(chatId, fs.createReadStream(tempFile), {
        caption: `🎬 Video từ apivd\n💸 -${cost}$\n🔗 ${videoUrl}`
      });

      Currencies.decreaseMoney(userId, cost);
      fs.unlink(tempFile, () => {});

      // Tự xóa tin nhắn sau 50s
      setTimeout(() => {
        bot.deleteMessage(chatId, sent.message_id).catch(() => {});
      }, 50000);
    } catch (err) {
      console.error('❌ Lỗi apivd:', err && err.message ? err.message : err);
      fs.unlink(tempFile, () => {});
      bot.sendMessage(chatId, `❌ Lỗi khi lấy video.\n📌 Chi tiết: ${err && err.message ? err.message : err}`);
    }
  }
};