const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Chia nhỏ văn bản thành các đoạn nhỏ hơn 200 ký tự
 */
function splitText(text, maxLength = 200) {
  const words = text.split(' ');
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + word).length < maxLength) {
      currentChunk += (currentChunk === '' ? '' : ' ') + word;
    } else {
      chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

async function textToSpeech(text, lang = 'vi') {
  try {
    const chunks = splitText(text, 200);
    const tempDir = path.join(__dirname, '../cache');
    fs.ensureDirSync(tempDir);
    const finalFile = path.join(tempDir, `${uuidv4()}.mp3`);

    const writeStream = fs.createWriteStream(finalFile);

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: {
          'Referer': 'http://www.gstatic.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      await new Promise((resolve, reject) => {
        response.data.pipe(writeStream, { end: false });
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
      // Thêm một chút delay nhỏ giữa các request để tránh bị Google block
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    writeStream.end();
    return new Promise((resolve) => {
      writeStream.on('finish', () => resolve(finalFile));
    });

  } catch (error) {
    console.error('❌ TTS Error:', error.message);
    return null;
  }
}

module.exports = { textToSpeech };
