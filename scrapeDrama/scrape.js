const axios = require('axios');
const cheerio = require('cheerio');

// REPLACE THIS with your Google Apps Script Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwHa2fa4e_QdyfD3z01tXepwY9ZyY98UlS_6mjVGOsPZaoHVloSyEc9_kJniuNn2_X/exec';

const BASE_URL = 'https://777tv.ai';
const PLAY_BASE_URL = 'https://play.777tv.ai';

async function scrapeDrama(id) {
    try {
        console.log(`[1/3] Fetching detail page for ID: ${id}...`);
        const detailUrl = `${BASE_URL}/vod/detail/id/${id}.html`;
        const { data: html } = await axios.get(detailUrl);
        const $ = cheerio.load(html);

        const title = $('h1').text().trim();
        const introduction = $('.stui-content__desc').text().trim();
        const coverImage = $('.stui-content__thumb .lazyload').attr('data-original') || $('meta[property="og:image"]').attr('content') || "";

        console.log(`Found: ${title}`);

        const sources = [];
        
        // Robust extraction: Iterate through each panel to pair title with its own playlist
        $('.stui-pannel').each((index, element) => {
            const titleEl = $(element).find('.stui-pannel__head .title');
            const playlistEl = $(element).find('.stui-content__playlist');
            
            if (titleEl.length > 0 && playlistEl.length > 0) {
                const lineName = titleEl.text().trim();
                
                // Exclude known non-line panels
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

        console.log(`[2/3] Extracting playback links for ${sources.length} lines...`);

        // For each episode, fetch the .m3u8 link from the play page
        for (const source of sources) {
            console.log(`Processing line: ${source.line_name}`);
            for (const episode of source.episodes) {
                try {
                    const fullPlayUrl = episode.playPageUrl.startsWith('http') ? episode.playPageUrl : `${PLAY_BASE_URL}${episode.playPageUrl}`;
                    const { data: playHtml } = await axios.get(fullPlayUrl);
                    
                    // Use Regex to find the MacPlayer JSON object
                    const match = playHtml.match(/var\s+MacPlayer\s*=\s*({.*?});/);
                    if (match && match[1]) {
                        const playerConfig = JSON.parse(match[1]);
                        episode.play_url = playerConfig.url; // This is the .m3u8 link
                    }
                } catch (e) {
                    console.error(`Error fetching play link for ${episode.name}:`, e.message);
                }
                // Small delay to be polite to the server
                await new Promise(r => setTimeout(r, 200));
            }
        }

        const result = {
            id: id,
            name: title,
            introduction: introduction,
            cover_image: coverImage,
            sources: sources
        };

        if (GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
            console.log('\n--- Scrape Complete (Local Only) ---');
            console.log(JSON.stringify(result, null, 2));
            console.log('\n[!] GAS_URL is not set. Data was not sent to Google Sheets.');
        } else {
            console.log(`[3/3] Sending data to Google Sheets...`);
            const response = await axios.post(GAS_URL, result);
            console.log('Response from GAS:', response.data);
        }

        return result;

    } catch (error) {
        console.error('Scrape failed:', error.message);
    }
}

// Get ID from command line argument
const targetId = process.argv[2];
if (targetId) {
    scrapeDrama(targetId);
} else {
    console.log('Usage: node scrape.js <ID>');
}
