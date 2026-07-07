const axios = require('axios');
const cheerio = require('cheerio');

async function getTopNews() {
  try {
    // Sử dụng RSS feed của VnExpress để ổn định hơn cào HTML
    const response = await axios.get('https://vnexpress.net/rss/tin-moi-nhat.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const news = [];

    $('item').each((i, el) => {
      if (i < 5) { // Lấy 5 tin mới nhất
        const title = $(el).find('title').text().trim();
        let rawDescription = $(el).find('description').text().trim();
        const link = $(el).find('link').text().trim();

        // Sử dụng cheerio để lọc bỏ hoàn toàn các thẻ HTML trong description
        // (VnExpress RSS thường để tag <a>, <img> và <br> trong CDATA)
        const $desc = cheerio.load(rawDescription);
        const description = $desc.text().trim();

        if (title && link) {
          news.push({ title, description, link });
        }
      }
    });

    return news;
  } catch (error) {
    console.error('❌ Lỗi lấy tin từ RSS:', error.message);
    return [];
  }
}

module.exports = { getTopNews };
