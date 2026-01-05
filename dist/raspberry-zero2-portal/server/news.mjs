import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
// --- Hardcoded News Sources (70 total, 10 per category) ---
const HARDCODED_SOURCES = [
    // LOCAL (Hawaii-focused)
    { id: 'L1', name: 'Honolulu Star-Advertiser', url: 'https://www.staradvertiser.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L2', name: 'KITV', url: 'https://www.kitv.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L3', name: 'Hawaii News Now', url: 'https://www.hawaiinewsnow.com/rss/', type: 'news', category: 'Local', enabled: true },
    { id: 'L4', name: 'Hawaii Public Radio', url: 'https://www.hawaiipublicradio.org/rss/', type: 'news', category: 'Local', enabled: true },
    { id: 'L5', name: 'Maui Now', url: 'https://mauinow.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L6', name: 'Big Island Now', url: 'https://bigislandnow.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L7', name: 'West Hawaii Today', url: 'https://www.westhawaiitoday.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L8', name: 'KHON2', url: 'https://www.khon2.com/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L9', name: 'Civil Beat', url: 'https://www.civilbeat.org/feed/', type: 'news', category: 'Local', enabled: true },
    { id: 'L10', name: 'Pacific Business News', url: 'https://www.bizjournals.com/pacific/feed/rss', type: 'news', category: 'Local', enabled: true },
    // WORLD
    { id: 'W1', name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', type: 'news', category: 'World', enabled: true },
    { id: 'W2', name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?best-topics=world-news', type: 'news', category: 'World', enabled: true },
    { id: 'W3', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', type: 'news', category: 'World', enabled: true },
    { id: 'W4', name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', type: 'news', category: 'World', enabled: true },
    { id: 'W5', name: 'DW News', url: 'https://rss.dw.com/rdf/rss-en-all', type: 'news', category: 'World', enabled: true },
    { id: 'W6', name: 'France 24', url: 'https://www.france24.com/en/rss', type: 'news', category: 'World', enabled: true },
    { id: 'W7', name: 'AP News World', url: 'https://rsshub.app/apnews/topics/world-news', type: 'news', category: 'World', enabled: true },
    { id: 'W8', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', type: 'news', category: 'World', enabled: true },
    { id: 'W9', name: 'South China Morning Post', url: 'https://www.scmp.com/rss/91/feed', type: 'news', category: 'World', enabled: true },
    { id: 'W10', name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed/', type: 'news', category: 'World', enabled: true },
    // US POLITICS
    { id: 'P1', name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P2', name: 'The Hill', url: 'https://thehill.com/feed/', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P3', name: 'Roll Call', url: 'https://www.rollcall.com/feed/', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P4', name: 'RealClearPolitics', url: 'https://www.realclearpolitics.com/index.xml', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P5', name: 'C-SPAN', url: 'https://www.c-span.org/rss/', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P6', name: 'Washington Post Politics', url: 'https://feeds.washingtonpost.com/rss/politics', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P7', name: 'NYT Politics', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P8', name: 'Axios', url: 'https://api.axios.com/feed/', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P9', name: 'The Intercept', url: 'https://theintercept.com/feed/?rss', type: 'news', category: 'US Politics', enabled: true },
    { id: 'P10', name: 'FiveThirtyEight', url: 'https://fivethirtyeight.com/politics/feed/', type: 'news', category: 'US Politics', enabled: true },
    // TECH
    { id: 'T1', name: 'Hacker News', url: 'https://news.ycombinator.com/rss', type: 'news', category: 'Tech', enabled: true },
    { id: 'T2', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'news', category: 'Tech', enabled: true },
    { id: 'T3', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'news', category: 'Tech', enabled: true },
    { id: 'T4', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', type: 'news', category: 'Tech', enabled: true },
    { id: 'T5', name: 'Wired', url: 'https://www.wired.com/feed/rss', type: 'news', category: 'Tech', enabled: true },
    { id: 'T6', name: 'AnandTech', url: 'https://www.anandtech.com/rss/', type: 'news', category: 'Tech', enabled: true },
    { id: 'T7', name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all', type: 'news', category: 'Tech', enabled: true },
    { id: 'T8', name: 'Engadget', url: 'https://www.engadget.com/rss.xml', type: 'news', category: 'Tech', enabled: true },
    { id: 'T9', name: '9to5Mac', url: 'https://9to5mac.com/feed/', type: 'news', category: 'Tech', enabled: true },
    { id: 'T10', name: 'The Register', url: 'https://www.theregister.com/headlines.atom', type: 'news', category: 'Tech', enabled: true },
    // AI
    { id: 'A1', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'news', category: 'AI', enabled: true },
    { id: 'A2', name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', type: 'news', category: 'AI', enabled: true },
    { id: 'A3', name: 'Anthropic', url: 'https://www.anthropic.com/feed', type: 'news', category: 'AI', enabled: true },
    { id: 'A4', name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', type: 'news', category: 'AI', enabled: true },
    { id: 'A5', name: 'AI Breakfast', url: 'https://aibreakfast.beehiiv.com/feed', type: 'news', category: 'AI', enabled: true },
    { id: 'A6', name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/', type: 'news', category: 'AI', enabled: true },
    { id: 'A7', name: 'Import AI', url: 'https://importai.substack.com/feed', type: 'news', category: 'AI', enabled: true },
    { id: 'A8', name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', type: 'news', category: 'AI', enabled: true },
    { id: 'A9', name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'news', category: 'AI', enabled: true },
    { id: 'A10', name: 'AI Weekly', url: 'https://aiweekly.co/issues.rss', type: 'news', category: 'AI', enabled: true },
    // FINANCE
    { id: 'F1', name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', type: 'news', category: 'Finance', enabled: true },
    { id: 'F2', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', type: 'news', category: 'Finance', enabled: true },
    { id: 'F3', name: 'Financial Times', url: 'https://www.ft.com/rss/home', type: 'news', category: 'Finance', enabled: true },
    { id: 'F4', name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', type: 'news', category: 'Finance', enabled: true },
    { id: 'F5', name: 'WSJ Markets', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', type: 'news', category: 'Finance', enabled: true },
    { id: 'F6', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/rss/', type: 'news', category: 'Finance', enabled: true },
    { id: 'F7', name: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml', type: 'news', category: 'Finance', enabled: true },
    { id: 'F8', name: 'The Motley Fool', url: 'https://www.fool.com/feeds/index.aspx', type: 'news', category: 'Finance', enabled: true },
    { id: 'F9', name: "Barron's", url: 'https://www.barrons.com/rss', type: 'news', category: 'Finance', enabled: true },
    { id: 'F10', name: 'Investopedia', url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline', type: 'news', category: 'Finance', enabled: true },
    // SCIENCE
    { id: 'S1', name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', type: 'news', category: 'Science', enabled: true },
    { id: 'S2', name: 'Nature', url: 'https://www.nature.com/nature.rss', type: 'news', category: 'Science', enabled: true },
    { id: 'S3', name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', type: 'news', category: 'Science', enabled: true },
    { id: 'S4', name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', type: 'news', category: 'Science', enabled: true },
    { id: 'S5', name: 'Phys.org', url: 'https://phys.org/rss-feed/', type: 'news', category: 'Science', enabled: true },
    { id: 'S6', name: 'Ars Technica Science', url: 'https://feeds.arstechnica.com/arstechnica/science', type: 'news', category: 'Science', enabled: true },
    { id: 'S7', name: 'Popular Science', url: 'https://www.popsci.com/feed/', type: 'news', category: 'Science', enabled: true },
    { id: 'S8', name: 'Scientific American', url: 'https://www.scientificamerican.com/feed/', type: 'news', category: 'Science', enabled: true },
    { id: 'S9', name: 'Live Science', url: 'https://www.livescience.com/feeds/all', type: 'news', category: 'Science', enabled: true },
    { id: 'S10', name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', type: 'news', category: 'Science', enabled: true },
];
// --- Simple RSS Parser (Zero Dependency) ---
async function fetchAndParseRSS(url) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(text)) !== null) {
            const itemContent = match[1];
            const getTag = (tag) => {
                const r = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, 's');
                const m = r.exec(itemContent);
                return m ? m[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
            };
            const enclosureMatch = /<enclosure[^>]*url=["']([^"']*)[^>]*type=["']([^"']*)/i.exec(itemContent);
            items.push({
                title: getTag('title'),
                link: getTag('link'),
                contentSnippet: getTag('description').replace(/<[^>]*>/g, '').substring(0, 500),
                pubDate: getTag('pubDate'),
                enclosure: enclosureMatch ? { url: enclosureMatch[1], type: enclosureMatch[2] } : undefined
            });
        }
        return items;
    }
    catch (e) {
        console.warn(`Failed to parse RSS from ${url}:`, e);
        return [];
    }
}
// --- Service ---
export class NewsService {
    dataDir;
    briefingsDir;
    gemini;
    elevenLabsApiKey;
    inworldApiKey;
    inworldSecret;
    constructor(dataDir, geminiApiKey, elevenLabsApiKey, inworldApiKey, inworldSecret) {
        this.dataDir = dataDir;
        this.briefingsDir = join(dataDir, 'briefings');
        this.gemini = new GoogleGenerativeAI(geminiApiKey);
        this.elevenLabsApiKey = elevenLabsApiKey;
        this.inworldApiKey = inworldApiKey;
        this.inworldSecret = inworldSecret;
        if (!existsSync(this.dataDir))
            mkdirSync(this.dataDir, { recursive: true });
        if (!existsSync(this.briefingsDir))
            mkdirSync(this.briefingsDir, { recursive: true });
    }
    getSources() {
        return HARDCODED_SOURCES;
    }
    getBriefing(date) {
        const file = join(this.briefingsDir, `${date}.json`);
        if (existsSync(file)) {
            return JSON.parse(readFileSync(file, 'utf8'));
        }
        return null;
    }
    async generateDailyBriefing(force = false) {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.getBriefing(today);
        if (existing && !force)
            return existing;
        const sources = this.getSources().filter(s => s.enabled);
        const articles = [];
        const podcastTracks = [];
        // 1. Fetch (limit concurrent fetches for Pi performance)
        for (const source of sources) {
            const items = await fetchAndParseRSS(source.url);
            items.slice(0, 2).forEach(item => {
                let enclosure = undefined;
                if (item.enclosure?.type?.startsWith('audio')) {
                    enclosure = { url: item.enclosure.url, type: item.enclosure.type };
                    if (source.type === 'podcast') {
                        podcastTracks.push({
                            title: item.title || 'Podcast Episode',
                            url: item.enclosure.url,
                            type: 'podcast'
                        });
                    }
                }
                articles.push({
                    title: item.title || '',
                    link: item.link || '',
                    snippet: item.contentSnippet || '',
                    sourceName: source.name,
                    category: source.category,
                    enclosure,
                    pubDate: item.pubDate || ''
                });
            });
        }
        // 2. Summarize with Gemini
        let summaryText = "No summary generated.";
        let narrativeScript = "";
        if (articles.length > 5) {
            try {
                const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a news anchor. Create a daily briefing summary from the following headlines.
Organize the summary by category (Local, World, US Politics, Tech, AI, Finance, Science).
Format it as a concise bulleted list in Markdown, with category headers.
Also provide a "narrativeScript" that flows naturally for reading aloud.

Input:
${articles.map(a => `[${a.category}] ${a.sourceName} - ${a.title}: ${a.snippet}`).join('\n').substring(0, 15000)}

Output as JSON:
{
    "bulletPoints": "string with markdown bullets",
    "narrativeScript": "string for TTS reading"
}`;
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                // Extract JSON from response
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const content = JSON.parse(jsonMatch[0]);
                    summaryText = content.bulletPoints || "Summary failed.";
                    narrativeScript = content.narrativeScript || "";
                }
            }
            catch (e) {
                console.error("Gemini Error:", e);
                summaryText = "Error generating summary.";
            }
        }
        // 3. Audio with Inworld TTS (primary) or ElevenLabs (fallback)
        let summaryAudioUrl = '';
        if (this.inworldApiKey && this.inworldSecret && narrativeScript) {
            try {
                // Inworld TTS implementation placeholder
                // TODO: Implement Inworld REST API when SDK is available
                console.log("Inworld TTS configured. Using ElevenLabs as fallback until Inworld SDK is integrated.");
                if (this.elevenLabsApiKey) {
                    summaryAudioUrl = await this.generateElevenLabsAudio(narrativeScript);
                }
            }
            catch (e) {
                console.error("Inworld Audio generation failed", e);
            }
        }
        else if (this.elevenLabsApiKey && narrativeScript) {
            try {
                summaryAudioUrl = await this.generateElevenLabsAudio(narrativeScript);
            }
            catch (e) {
                console.error("Audio generation failed", e);
            }
        }
        // 4. Playlist
        const audioPlaylist = [];
        if (summaryAudioUrl) {
            audioPlaylist.push({ title: 'Daily Summary', url: summaryAudioUrl, type: 'summary' });
        }
        audioPlaylist.push(...podcastTracks);
        const briefing = {
            date: today,
            generatedAt: new Date().toISOString(),
            summaryText,
            audioPlaylist,
            articles
        };
        writeFileSync(join(this.briefingsDir, `${today}.json`), JSON.stringify(briefing, null, 2));
        return briefing;
    }
    async generateElevenLabsAudio(text) {
        const voiceId = "21m00Tcm4TlvDq8ikWAM";
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': this.elevenLabsApiKey || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text.substring(0, 5000), // ElevenLabs limit
                model_id: "eleven_monolingual_v1",
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            })
        });
        if (!response.ok)
            throw new Error(`ElevenLabs error: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename = `summary-${Date.now()}.mp3`;
        const audioDir = join(this.dataDir, 'audio');
        if (!existsSync(audioDir))
            mkdirSync(audioDir, { recursive: true });
        writeFileSync(join(audioDir, filename), buffer);
        return `/api/audio/${filename}`;
    }
}
