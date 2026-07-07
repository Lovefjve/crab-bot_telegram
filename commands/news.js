const { getTopNews } = require('../services/news');
const { textToSpeech } = require('../services/tts');
const fs = require('fs-extra');

module.exports = {
  run: async ({ bot, msg }) => {
    const chatId = msg.chat.id;

    try {
      const sentMsg = await bot.sendMessage(chatId, '⏳ Đang tổng hợp và tóm tắt bản tin 5 tin mới nhất...');

      const newsList = await getTopNews();
      if (newsList.length === 0) {
        return bot.editMessageText('❌ Không lấy được tin tức.', { chat_id: chatId, message_id: sentMsg.message_id });
      }

      let newsText = '📰 TỔNG HỢP & TÓM TẮT TIN TỨC\n\n';
      let ttsText = 'Chào bạn, sau đây là tóm tắt 5 bản tin mới nhất từ VnExpress. ';

      newsList.forEach((news, index) => {
        // Hiển thị text trên Telegram
        newsText += `🔹 ${index + 1}. ${news.title}\n📝 ${news.description}\n🔗 ${news.link}\n\n`;

        // Nội dung chuẩn bị cho TTS
        ttsText += `Tin thứ ${index + 1}: ${news.title}. ${news.description}. `;
      });

      ttsText += ' Cảm ơn bạn đã lắng nghe bản tin.';

      await bot.editMessageText(newsText, {
        chat_id: chatId,
        message_id: sentMsg.message_id,
        disable_web_page_preview: true
      });

      // Tạo và gửi voice (Đã hỗ trợ văn bản dài bằng cách chia nhỏ chunks)
      const audioPath = await textToSpeech(ttsText);
      if (audioPath) {
        await bot.sendVoice(chatId, fs.createReadStream(audioPath), {
          caption: '🎙️ Bản tin tóm tắt 5 tin mới nhất'
        });
        fs.unlink(audioPath, () => {});
      }

    } catch (error) {
      console.error('Error in news command:', error);
      bot.sendMessage(chatId, '❌ Đã xảy ra lỗi khi xử lý tin tức.');
    }
  }
};
