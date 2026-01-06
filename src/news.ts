
import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- Types ---

export interface NewsSource {
    id: string;
    name: string;
    url: string;
    type: 'news' | 'podcast';
    category: string;
    enabled: boolean;
}

export interface NewsItem {
    title: string;
    link: string;
    snippet: string;
    sourceName: string;
    category: string;
    enclosure?: { url: string, type: string };
    pubDate: string;
}

export interface AudioTrack {
    title: string;
    url: string;
    type: 'summary' | 'podcast';
}

export interface DailyBriefing {
    date: string;
    generatedAt: string;
    summaryText: string;
    audioPlaylist: AudioTrack[];
    articles: NewsItem[];
}

// --- Hardcoded News Sources (80 total, Breaking News + 10 per category) ---

const HARDCODED_SOURCES: NewsSource[] = [
    // BREAKING NEWS (urgent/real-time feeds)
    { id: 'BN1', name: 'AP Breaking News', url: 'https://apnews.com/rss/topnews', type: 'news', category: 'Breaking News', enabled: true },
    { id: 'BN2', name: 'Reuters Top News', url: 'https://www.reutersagency.com/feed/?best-topics=top-news&post_type=best', type: 'news', category: 'Breaking News', enabled: true },
    { id: 'BN3', name: 'BBC Breaking', url: 'https://feeds.bbci.co.uk/news/rss.xml', type: 'news', category: 'Breaking News', enabled: true },
    { id: 'BN4', name: 'NPR Breaking', url: 'https://feeds.npr.org/1001/rss.xml', type: 'news', category: 'Breaking News', enabled: true },
    { id: 'BN5', name: 'Google News Top', url: 'https://news.google.com/rss', type: 'news', category: 'Breaking News', enabled: true },

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

async function fetchAndParseRSS(url: string): Promise<any[]> {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        const items: any[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(text)) !== null) {
            const itemContent = match[1];

            const getTag = (tag: string) => {
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
    } catch (e) {
        console.warn(`Failed to parse RSS from ${url}:`, e);
        return [];
    }
}

// --- Service ---

interface VoicePersonality {
    voiceId: string;
    name: string;
    personality: string;
}

const DEFAULT_CATEGORY_PRIORITIES = [
    'Breaking News', 'AI', 'Tech', 'Local', 'World',
    'Business', 'Science', 'Finance', 'Politics', 'Health'
];

export class NewsService {
    private dataDir: string;
    private briefingsDir: string;
    private gemini: GoogleGenerativeAI;
    private elevenLabsApiKey: string | undefined;
    private inworldApiKey: string | undefined;
    private inworldSecret: string | undefined;
    private inworldVoices: string[];
    private voicePersonalities: VoicePersonality[];
    private categoryPriorities: string[];

    constructor(
        dataDir: string,
        geminiApiKey: string,
        elevenLabsApiKey?: string,
        inworldApiKey?: string,
        inworldSecret?: string,
        inworldVoicesStr?: string,
        voicePersonalities?: VoicePersonality[],
        categoryPriorities?: string[]
    ) {
        this.dataDir = dataDir;
        this.briefingsDir = join(dataDir, 'briefings');
        this.gemini = new GoogleGenerativeAI(geminiApiKey);
        this.elevenLabsApiKey = elevenLabsApiKey;
        this.inworldApiKey = inworldApiKey;
        this.inworldSecret = inworldSecret;

        // Parse comma-separated voice list (legacy), default to Ashley
        this.inworldVoices = inworldVoicesStr
            ? inworldVoicesStr.split(',').map(v => v.trim()).filter(v => v)
            : ['Ashley'];

        // Voice personalities with prompts
        this.voicePersonalities = voicePersonalities || [];

        // Category priorities
        this.categoryPriorities = categoryPriorities || DEFAULT_CATEGORY_PRIORITIES;

        if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
        if (!existsSync(this.briefingsDir)) mkdirSync(this.briefingsDir, { recursive: true });
    }

    getSources(): NewsSource[] {
        return HARDCODED_SOURCES;
    }

    getBriefing(date: string): DailyBriefing | null {
        const file = join(this.briefingsDir, `${date}.json`);
        if (existsSync(file)) {
            return JSON.parse(readFileSync(file, 'utf8'));
        }
        return null;
    }

    async generateDailyBriefing(force = false): Promise<DailyBriefing> {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.getBriefing(today);
        if (existing && !force) return existing;

        const sources = this.getSources().filter(s => s.enabled);
        const articles: NewsItem[] = [];
        const podcastTracks: AudioTrack[] = [];

        // 1. Fetch (limit concurrent fetches for Pi performance)
        for (const source of sources) {
            const items = await fetchAndParseRSS(source.url);
            items.slice(0, 2).forEach(item => { // Reduced to 2 per source for memory
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

        // 2. Sort articles by category priority
        articles.sort((a, b) => {
            const priorityA = this.categoryPriorities.indexOf(a.category);
            const priorityB = this.categoryPriorities.indexOf(b.category);
            // Items not in priority list go to end
            const orderA = priorityA === -1 ? 999 : priorityA;
            const orderB = priorityB === -1 ? 999 : priorityB;
            return orderA - orderB;
        });
        console.log(`Sorted ${articles.length} articles by category priority: ${this.categoryPriorities.slice(0, 3).join(', ')}...`);

        // 3. Select random voice personality (if configured)
        let selectedPersonality: VoicePersonality | null = null;
        if (this.voicePersonalities.length > 0) {
            selectedPersonality = this.voicePersonalities[Math.floor(Math.random() * this.voicePersonalities.length)];
            console.log(`Using personality: ${selectedPersonality.name}`);
        }

        // 4. Summarize with Gemini
        let summaryText = "No summary generated.";
        let narrativeScript = "";

        if (articles.length > 5) {
            try {
                const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

                // Build personality instruction
                const personalityInstruction = selectedPersonality
                    ? `PERSONALITY: ${selectedPersonality.personality}\n\nPresent the news in this character's style and voice.\n\n`
                    : '';

                // Prompt with optional personality injection
                const prompt = `${personalityInstruction}You are a news anchor. Create a comprehensive daily briefing from the following headlines.

IMPORTANT: Create a COMPLETE narrative script that covers ALL the major headlines. The script should be 2-3 minutes when read aloud (about 300-500 words).

Respond with ONLY this exact JSON structure (no markdown, no extra text):
{"bulletPoints": "- Category: Headline summary\\n- Category: Another headline", "narrativeScript": "Good morning. Here's what's happening today. [Complete narrative covering all major stories]..."}

Headlines (sorted by priority):
${articles.slice(0, 40).map(a => `[${a.category}] ${a.title}`).join('\n')}`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text().trim();

                // Robust JSON extraction
                let content: { bulletPoints?: string; narrativeScript?: string } | null = null;

                // Try direct parse first
                try {
                    content = JSON.parse(responseText);
                } catch {
                    // Try to find JSON object in response
                    const jsonStart = responseText.indexOf('{');
                    const jsonEnd = responseText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        try {
                            content = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
                        } catch {
                            console.log("JSON extraction failed, using plaintext fallback");
                        }
                    }
                }

                if (content && content.bulletPoints) {
                    summaryText = content.bulletPoints;
                    narrativeScript = content.narrativeScript || "";
                } else {
                    // Plaintext fallback - just use the raw response as summary
                    summaryText = responseText.length > 50 ? responseText : "Summary failed.";
                    narrativeScript = summaryText;
                }
            } catch (e) {
                console.error("Gemini Error:", e);
                summaryText = "Error generating summary.";
            }
        }

        // 5. Audio with Inworld TTS (primary) or ElevenLabs (fallback)
        let summaryAudioUrl = '';

        if (this.inworldApiKey && this.inworldSecret && narrativeScript) {
            try {
                console.log("Generating audio with Inworld TTS...");
                // Pass selected personality for voice matching
                summaryAudioUrl = await this.generateInworldAudio(narrativeScript, selectedPersonality);
            } catch (e) {
                console.error("Inworld Audio generation failed:", e);
                // Fallback to ElevenLabs if available
                if (this.elevenLabsApiKey) {
                    console.log("Falling back to ElevenLabs TTS...");
                    summaryAudioUrl = await this.generateElevenLabsAudio(narrativeScript);
                }
            }
        } else if (this.elevenLabsApiKey && narrativeScript) {
            try {
                summaryAudioUrl = await this.generateElevenLabsAudio(narrativeScript);
            } catch (e) {
                console.error("Audio generation failed", e);
            }
        }

        // 4. Playlist
        const audioPlaylist: AudioTrack[] = [];
        if (summaryAudioUrl) {
            audioPlaylist.push({ title: 'Daily Summary', url: summaryAudioUrl, type: 'summary' });
        }
        audioPlaylist.push(...podcastTracks);

        const briefing: DailyBriefing = {
            date: today,
            generatedAt: new Date().toISOString(),
            summaryText,
            audioPlaylist,
            articles
        };

        writeFileSync(join(this.briefingsDir, `${today}.json`), JSON.stringify(briefing, null, 2));
        return briefing;
    }

    private async generateInworldAudio(text: string, personality?: VoicePersonality | null): Promise<string> {
        // Inworld TTS REST API
        // Docs: https://docs.inworld.ai/docs/tutorial-integrations/tts/quickstart/
        const url = 'https://api.inworld.ai/tts/v1/voice';

        // Basic Auth: base64(apiKey:apiSecret)
        const credentials = Buffer.from(`${this.inworldApiKey}:${this.inworldSecret}`).toString('base64');

        // Inworld API limit is 2000 characters
        const textToSpeak = text.substring(0, 2000);

        // Voice selection: use personality voice if available, else random from legacy list
        let selectedVoice: string;
        if (personality && personality.voiceId) {
            selectedVoice = personality.voiceId;
            console.log(`Inworld TTS using personality voice: ${personality.name} (${selectedVoice})`);
        } else {
            selectedVoice = this.inworldVoices[Math.floor(Math.random() * this.inworldVoices.length)];
            console.log(`Inworld TTS using random voice: ${selectedVoice} (from ${this.inworldVoices.length} options)`);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textToSpeak,
                voiceId: selectedVoice,
                modelId: 'inworld-tts-1'  // Standard model (cost-efficient)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Inworld TTS error ${response.status}: ${errorText}`);
        }

        const result = await response.json() as { audioContent?: string };

        if (!result.audioContent) {
            throw new Error('Inworld TTS response missing audioContent');
        }

        // Decode base64 audio to buffer
        const audioBuffer = Buffer.from(result.audioContent, 'base64');

        // Save audio file
        const filename = `inworld-summary-${Date.now()}.mp3`;
        const audioDir = join(this.dataDir, 'audio');
        if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

        writeFileSync(join(audioDir, filename), audioBuffer);
        console.log(`Inworld TTS audio saved: ${filename} (${audioBuffer.length} bytes)`);

        return `/api/audio/${filename}`;
    }

    private async generateElevenLabsAudio(text: string): Promise<string> {
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

        if (!response.ok) throw new Error(`ElevenLabs error: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename = `summary-${Date.now()}.mp3`;

        const audioDir = join(this.dataDir, 'audio');
        if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

        writeFileSync(join(audioDir, filename), buffer);

        return `/api/audio/${filename}`;
    }
}
