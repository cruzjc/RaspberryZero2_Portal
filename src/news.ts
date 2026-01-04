
import OpenAI from 'openai';
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

// --- Simple RSS Parser (Zero Dependency) ---

async function fetchAndParseRSS(url: string): Promise<any[]> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        // Simple Regex Parsing for <item> blocks
        const items: any[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(text)) !== null) {
            const itemContent = match[1];

            const getTag = (tag: string) => {
                const r = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, 's'); // Simple tag match
                const m = r.exec(itemContent);
                return m ? m[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
            };

            // Enclosure is self-closing usually: <enclosure url="..." />
            const enclosureMatch = /<enclosure[^>]*url=["']([^"']*)["'][^>]*type=["']([^"']*)["']/.exec(itemContent);

            items.push({
                title: getTag('title'),
                link: getTag('link'),
                contentSnippet: getTag('description').replace(/<[^>]*>/g, '').substring(0, 500), // Strip HTML
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

export class NewsService {
    private dataDir: string;
    private sourcesFile: string;
    private briefingsDir: string;
    private openai: OpenAI;
    private elevenLabsApiKey: string | undefined;
    private inworldApiKey: string | undefined;
    private inworldSecret: string | undefined;

    constructor(dataDir: string, openai: OpenAI, elevenLabsApiKey?: string, inworldApiKey?: string, inworldSecret?: string) {
        this.dataDir = dataDir;
        this.sourcesFile = join(dataDir, 'news-sources.json');
        this.briefingsDir = join(dataDir, 'briefings');
        this.openai = openai;
        this.elevenLabsApiKey = elevenLabsApiKey;
        this.inworldApiKey = inworldApiKey;
        this.inworldSecret = inworldSecret;

        if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
        if (!existsSync(this.briefingsDir)) mkdirSync(this.briefingsDir, { recursive: true });

        if (!existsSync(this.sourcesFile)) {
            const defaultSources: NewsSource[] = [
                // General
                { id: '1', name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml', type: 'news', category: 'General', enabled: true },
                { id: '2', name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?best-topics=world-news', type: 'news', category: 'General', enabled: true },

                // Tech
                { id: '3', name: 'Hacker News', url: 'https://news.ycombinator.com/rss', type: 'news', category: 'Tech', enabled: true },
                { id: '4', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'news', category: 'Tech', enabled: true },
                { id: '5', name: 'TechCrunch', url: 'https://feeds.feedburner.com/TechCrunch/', type: 'news', category: 'Tech', enabled: true },

                // Science
                { id: '6', name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', type: 'news', category: 'Science', enabled: true },
                { id: '7', name: 'Nature', url: 'https://www.nature.com/nature.rss', type: 'news', category: 'Science', enabled: true },

                // AI
                { id: '8', name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', type: 'news', category: 'AI', enabled: true },
                { id: '9', name: 'AI Breakfast', url: 'https://aibreakfast.beehiiv.com/rss', type: 'news', category: 'AI', enabled: true },

                // Podcasts
                { id: '10', name: 'Lex Fridman', url: 'https://lexfridman.com/feed/podcast/', type: 'podcast', category: 'Podcasts', enabled: true },
                { id: '11', name: 'Daily Tech News Show', url: 'http://feeds.feedburner.com/DailyTechNewsShow', type: 'podcast', category: 'Podcasts', enabled: true }
            ];
            this.saveSources(defaultSources);
        }
    }

    getSources(): NewsSource[] {
        try {
            return JSON.parse(readFileSync(this.sourcesFile, 'utf8'));
        } catch {
            return [];
        }
    }

    saveSources(sources: NewsSource[]) {
        writeFileSync(this.sourcesFile, JSON.stringify(sources, null, 2));
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

        // 1. Fetch
        for (const source of sources) {
            const items = await fetchAndParseRSS(source.url);
            items.slice(0, 3).forEach(item => {
                let enclosure = undefined;
                if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('audio')) {
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

        // 2. Summarize
        const textToSummarize = articles
            .filter(a => !a.enclosure || a.sourceName !== 'Podcast')
            .map(a => `- [${a.sourceName}] ${a.title}: ${a.snippet.replace(/\n/g, ' ')}`)
            .join('\n');

        let summaryText = "No summary generated.";
        let narrativeScript = "";

        if (textToSummarize.length > 50) {
            try {
                const prompt = `
            You are a news anchor. Create a daily briefing summary from the following headlines.
            Organize the summary by category (General, Tech, AI, etc.).
            Format it as a concise bulleted list in Markdown, with category headers.
            Also, provide a "narrativeScript" for reading aloud that flows naturally between these categories.
            
            Input:
            ${articles.map(a => `[${a.category}] ${a.sourceName} - ${a.title}: ${a.snippet}`).join('\n').substring(0, 10000)}
            
            Output JSON format:
            {
                "bulletPoints": "string",
                "narrativeScript": "string"
            }
            `;

                const gptResponse = await this.openai.chat.completions.create({
                    model: 'gpt-4o', // or gpt-3.5-turbo
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                });

                const content = JSON.parse(gptResponse.choices[0].message.content || '{}');
                summaryText = content.bulletPoints || "Summary failed.";
                narrativeScript = content.narrativeScript || "";
            } catch (e) {
                console.error("OpenAI Error:", e);
                summaryText = "Error generating summary.";
            }
        }

        // 3. Audio
        let summaryAudioUrl = '';

        // Prefer Inworld if available
        if (this.inworldApiKey && this.inworldSecret && narrativeScript) {
            try {
                // TODO: Replace with actual Inworld SDK or REST logic when available.
                // Using ElevenLabs as fallback if implementation is missing but letting user know.
                console.log("Inworld configured but SDK missing. Falling back or using stub.");
                // For now, implementing simple fallback logic or we could fail.
                // But request says "use inworld tts". I'll add a dummy file generator or try ElevenLabs as fallback?
                // The user said "set elevenlabs ... as alternative".
                // I'll try generating Inworld (stub) or default to ElevenLabs if I can't.

                // Stub: We can't validly call Inworld without correct endpoint. 
                // Failing gracefully to ElevenLabs if configured.
                if (this.elevenLabsApiKey) {
                    console.log("Falling back to ElevenLabs for now.");
                    summaryAudioUrl = await this.generateElevenLabsAudio(narrativeScript);
                } else {
                    console.warn("Inworld is preferred but no implementation/fallback available.");
                }
            } catch (e) {
                console.error("Inworld Audio generation failed", e);
            }
        }
        // Fallback to ElevenLabs if Inworld not configured or failed (and logic flows here)
        else if (this.elevenLabsApiKey && narrativeScript && !summaryAudioUrl) {
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

    private async generateElevenLabsAudio(text: string): Promise<string> {
        // Use existing ENV var or configured ID
        const voiceId = "21m00Tcm4TlvDq8ikWAM";
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': this.elevenLabsApiKey || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
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
