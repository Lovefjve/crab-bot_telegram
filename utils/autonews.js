const schedule = require('node-schedule');
const { getTopNews } = require('../services/news');
const { textToSpeech } = require('../services/tts');
const fs = require('fs-extra');
const Currencies = require('../services/currency');
const Threads = require('../services/threads');

function startAutoNews(bot) {
  // Hẹn giờ gửi vào 07:00 và 22:00 mỗi ngày
  const rule = new schedule.RecurrenceRule();
  rule.hour = [7, 22];
  rule.minute = 0;
  rule.second = 0;
  rule.tz = 'Asia/Ho_Chi_Minh';

  schedule.scheduleJob(rule, async () => {
    console.log('🗞️ Bắt đầu gửi bản tin tự động...');

    try {
      const newsList = await getTopNews();
      if (newsList.length === 0) return;

      let newsText = '🗞️ BẢN TIN TỰ ĐỘNG\n\n';
      let ttsText = 'Chào bạn, đây là bản tin tự động từ Crab Bot. ';

      newsList.forEach((news, index) => {
        newsText += `🔹 ${index + 1}. ${news.title}\n📝 ${news.description}\n🔗 ${news.link}\n\n`;
        ttsText += `Tin thứ ${index + 1}: ${news.title}. ${news.description}. `;
      });
      ttsText += ' Chúc bạn một ngày tốt lành hoặc một buổi tối tuyệt vời.';

      // Lấy danh sách ID đã bật autosend
      const users = Currencies.getAllUsersEnabled();
      const groups = Threads.getAllEnabled();
      const targetIds = [...new Set([...users, ...groups])];

      if (targetIds.length === 0) return;

      const audioPath = await textToSpeech(ttsText);

      for (const id of targetIds) {
        try {
          await bot.sendMessage(id, newsText, { disable_web_page_preview: true });
          if (audioPath) {
            await bot.sendVoice(id, fs.createReadStream(audioPath), {
              caption: '🎙️ Bản tin tóm tắt âm thanh tự động'
            });
          }
        } catch (e) {
          console.error(`❌ Lỗi gửi tin cho ${id}:`, e.message);
        }
      }

      if (audioPath) {
        setTimeout(() => fs.unlink(audioPath, () => {}), 10000); // Xóa sau khi đã gửi cho tất cả
      }

    } catch (err) {
      console.error('❌ Lỗi Auto News:', err);
    }
  });

  console.log('✅ Đã kích hoạt lịch gửi tin tức tự động: 07:00 và 22:00');
}

module.exports = startAutoNews;
