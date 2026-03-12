const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// REPLACE THIS with your Google Apps Script Web App URL
let GAS_URL = 'https://script.google.com/macros/s/AKfycbzwHa2fa4e_QdyfD3z01tXepwY9ZyY98UlS_6mjVGOsPZaoHVloSyEc9_kJniuNn2_X/exec';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const BASE_URL = 'https://777tv.ai';
const PLAY_BASE_URL = 'https://play.777tv.ai';

async function scrapeDrama(id, sendEvent) {
    try {
        sendEvent('status', { message: `[1/3] 正在獲取影片詳情 (ID: ${id})...` });
        
        const detailUrl = `${BASE_URL}/vod/detail/id/${id}.html`;
        const { data: html } = await axios.get(detailUrl);
        const $ = cheerio.load(html);

        const title = $('h1').first().text().trim();
        const introduction = $('.stui-content__desc').first().text().trim();
        const coverImage = $('.stui-content__thumb .lazyload').first().attr('data-original') || $('meta[property="og:image"]').attr('content') || "";

        if (!title) throw new Error('找不到影片標題，請確認 ID 是否正確');

        const sources = [];
        $('.stui-pannel').each((index, element) => {
            const titleEl = $(element).find('.stui-pannel__head .title');
            const playlistEl = $(element).find('.stui-content__playlist');
            
            if (titleEl.length > 0 && playlistEl.length > 0) {
                const lineName = titleEl.text().trim();
                const blackList = ['劇情介紹', '猜你喜歡', '熱門推薦', '相關推薦', '系列', '評論'];
                
                if (!blackList.some(item => lineName.includes(item))) {
                    const episodes = [];
                    const episodeLinks = playlistEl.find('li a');

                    episodeLinks.each((i, el) => {
                        episodes.push({
                            name: $(el).text().trim(),
                            playPageUrl: $(el).attr('href')
                        });
                    });

                    if (episodes.length > 0) {
                        sources.push({
                            line_name: lineName,
                            episodes: episodes
                        });
                    }
                }
            }
        });

        sendEvent('status', { 
            message: `[2/3] 找到 ${sources.length} 條線路，準備抓取影片位址...`,
            title: title
        });

        let totalEpisodes = sources.reduce((sum, s) => sum + s.episodes.length, 0);
        let processedCount = 0;

        for (const source of sources) {
            for (const episode of source.episodes) {
                processedCount++;
                sendEvent('progress', {
                    current: processedCount,
                    total: totalEpisodes,
                    line: source.line_name,
                    episode: episode.name,
                    message: `正在抓取：${source.line_name} - ${episode.name}`
                });

                try {
                    let fullPlayUrl = episode.playPageUrl;
                    // Handle relative or protocol-relative URLs
                    if (fullPlayUrl.startsWith('//')) {
                        fullPlayUrl = 'https:' + fullPlayUrl;
                    } else if (fullPlayUrl.startsWith('/')) {
                        fullPlayUrl = PLAY_BASE_URL + fullPlayUrl;
                    } else if (!fullPlayUrl.startsWith('http')) {
                        fullPlayUrl = BASE_URL + '/' + fullPlayUrl;
                    }

                    // Optimized: Use headers to avoid blocks/404s
                    const { data: playHtml } = await axios.get(fullPlayUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                            'Referer': BASE_URL + '/',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
                        }
                    });
                    
                    // Improved Regex: Allow optional semicolon and handle player_data/MacPlayer
                    const match = playHtml.match(/var\s+(?:player_data|MacPlayer)\s*=\s*({.*?})[\s;]*<\/script>/);
                    if (match && match[1]) {
                        try {
                            const config = JSON.parse(match[1]);
                            episode.play_url = config.url || config.PlayUrl || '';
                        } catch (e) {
                            console.error(`JSON parse error for ${episode.name}`);
                        }
                    } else {
                        // Fallback: search for "url":"..."
                        const urlMatch = playHtml.match(/"url"\s*:\s*"([^"]+)"/);
                        if (urlMatch && urlMatch[1]) {
                            episode.play_url = urlMatch[1].replace(/\\\//g, '/');
                        } else {
                            console.log(`No player config found for ${episode.name} at ${fullPlayUrl}`);
                        }
                    }
                } catch (e) {
                    console.error(`Error for ${episode.name}:`, e.message);
                }
                await new Promise(r => setTimeout(r, 100)); // Be nice to server
            }
        }

        const resultData = {
            id: id,
            name: title,
            introduction: introduction,
            cover_image: coverImage,
            sources: sources
        };

        let gasStatus = '僅本地執行 (未設定 GAS URL)';
        if (GAS_URL) {
            sendEvent('status', { message: `[3/3] 正在同步至 Google Sheets...` });
            try {
                const response = await axios.post(GAS_URL, resultData);
                gasStatus = '成功同步至 Google Sheets: ' + response.data;
            } catch (err) {
                gasStatus = '同步失敗: ' + err.message;
            }
        }

        sendEvent('done', {
            success: true,
            data: resultData,
            status: gasStatus
        });

    } catch (error) {
        sendEvent('done', { success: false, error: error.message });
    }
}

app.get('/api/scrape-progress', async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).send('ID is required');

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event, data) => {
        if (!res.writableEnded) {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
    };

    await scrapeDrama(id, sendEvent);
    res.end();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 Server running at http://localhost:${PORT}
------------------------------------------
1. Open http://localhost:${PORT} in your browser
2. Setup your Google Sheets Web App
3. Enter drama ID and start scraping!
    `);
});
