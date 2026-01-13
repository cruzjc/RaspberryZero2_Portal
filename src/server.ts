// Moved import to avoid Angular dependency
import express from 'express';
import crypto from 'crypto';
// ... existing code ...
import OpenAI from 'openai';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import { NewsService } from './news.js';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

// Helper for Inworld Signature
function generateInworldSignature(apiKey: string, apiSecret: string, host: string, path: string) {
    const now = new Date();
    // YYYYMMDDHHMM
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toISOString().split('T')[1].replace(/:/g, '').substring(0, 4); // HHMM? SDK said substring(0,6) HHMMSS? 
    // SDK: substring(0, 6) which is HHMMSS? 
    // SDK code: const time = parts[1].replace(/:/g, '').substring(0, 6); -> HHMMSS
    const datetime = `${date}${now.toISOString().split('T')[1].replace(/:/g, '').substring(0, 6)}`;

    const nonce = crypto.randomBytes(8).toString('hex'); // 8 bytes = 16 hex chars (SDK uses slice(1, 12)? 11 chars? SDK: crypto.randomBytes(16).toString('hex').slice(1, 12))
    // Let's mimic SDK exactly:
    const sdkNonce = crypto.randomBytes(16).toString('hex').slice(1, 12);

    let signature: string | Buffer = `IW1${apiSecret}`;

    const params = [
        datetime,
        host.replace(':443', ''),
        path,
        sdkNonce
    ];

    for (const p of params) {
        // HmacSHA256(p, signature). p is data. signature is key.
        // Node: createHmac(algo, key).update(data)
        signature = crypto.createHmac('sha256', signature).update(p, 'utf8').digest();
    }

    // Final signature: HmacSHA256('iw1_request', signature)
    const finalSig = crypto.createHmac('sha256', signature).update('iw1_request', 'utf8').digest('hex');

    return `IW1-HMAC-SHA256 ApiKey=${apiKey},DateTime=${datetime},Nonce=${sdkNonce},Signature=${finalSig}`;
}



const app = express();

interface VoicePersonality {
    voiceId: string;
    name: string;
    personality: string;
}

interface AppConfig {
    geminiApiKey?: string;
    elevenLabsApiKey?: string;
    inworldApiKey?: string;
    inworldSecret?: string;
    inworldVoices?: string;  // Legacy - comma separated
    inworldVoicePersonalities?: VoicePersonality[];
    categoryPriorities?: string[];
    // Trading
    alpacaKeyId?: string;
    alpacaSecretKey?: string;
    openaiApiKey?: string;
    // Inworld
    inworldScene?: string; // Format: workspaces/{workspace}/scenes/{scene} (or chars)
}

// ... existing code ...

app.post('/api/chat/inworld', async (req, res) => {
    // ... existing chat code ...
});

app.get('/api/voice/session', async (req, res) => {
    if (!appConfig.inworldApiKey || !appConfig.inworldSecret) {
        res.status(503).json({ error: 'Inworld API keys not configured' });
        return;
    }

    let personaName = 'ARIA';
    if (appConfig.inworldVoicePersonalities && appConfig.inworldVoicePersonalities.length > 0) {
        personaName = appConfig.inworldVoicePersonalities[0].name;
    }

    try {
        const host = 'api.inworld.ai';
        // Generic gRPC path for GenerateToken
        const path = '/ai.inworld.engine.WorldEngine/GenerateToken';
        // SDK strips leading slash for method in signature?
        const methodInSig = 'ai.inworld.engine.WorldEngine/GenerateToken';

        const authHeader = generateInworldSignature(
            appConfig.inworldApiKey,
            appConfig.inworldSecret,
            host,
            methodInSig
        );

        const response = await fetch(`https://${host}${path}`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: appConfig.inworldApiKey,
                resources: appConfig.inworldScene ? [appConfig.inworldScene] : []
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Inworld token error:', err);
            res.status(response.status).json({ error: `Inworld error: ${response.status} ${err}` });
            return;
        }

        const data = await response.json() as any;
        res.json({
            wsUrl: 'wss://api.inworld.ai/v1/session',
            sessionId: data.sessionId,
            accessToken: data.token,
            persona: personaName,
            configured: true,
            scene: appConfig.inworldScene
        });

    } catch (err: any) {
        console.error('Voice session error:', err);
        res.status(500).json({ error: err.message });
    }
});


const resourcesFile = join(os.homedir(), '.portal-resources.json');
const configFile = join(os.homedir(), '.portal-config.json');
const traderEnvFile = join(os.homedir(), '.trader-config.env');

// Write trader environment file for alpaca_ai_trader
function writeTraderEnv(config: AppConfig) {
    const lines: string[] = [];
    if (config.alpacaKeyId) lines.push(`ALPACA_API_KEY_ID=${config.alpacaKeyId}`);
    if (config.alpacaSecretKey) lines.push(`ALPACA_API_SECRET_KEY=${config.alpacaSecretKey}`);
    if (config.openaiApiKey) lines.push(`OPENAI_API_KEY=${config.openaiApiKey}`);
    writeFileSync(traderEnvFile, lines.join('\n') + '\n');
}

function readConfig(): AppConfig {
    try {
        if (existsSync(configFile)) {
            return JSON.parse(readFileSync(configFile, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading config:', e);
    }
    return {};
}

function saveConfig(config: AppConfig) {
    writeFileSync(configFile, JSON.stringify(config, null, 2));
}

// Initialize config from env or file
let appConfig = readConfig();

// Helper to load from env if present - environment variables take precedence
function syncEnv(key: keyof AppConfig, envVar: string) {
    if (process.env[envVar]) {
        (appConfig as any)[key] = process.env[envVar];
    }
}

syncEnv('geminiApiKey', 'GEMINI_API_KEY');
syncEnv('elevenLabsApiKey', 'ELEVENLABS_API_KEY');
syncEnv('inworldApiKey', 'INWORLD_API_KEY');
syncEnv('inworldSecret', 'INWORLD_SECRET');
syncEnv('inworldScene', 'INWORLD_SCENE');
syncEnv('alpacaKeyId', 'ALPACA_API_KEY_ID');
syncEnv('alpacaSecretKey', 'ALPACA_API_SECRET_KEY');
syncEnv('openaiApiKey', 'OPENAI_API_KEY');

// Lazy initialization - only create when keys available
let newsService: NewsService | null = null;

function initializeServices() {
    if (appConfig.geminiApiKey) {
        newsService = new NewsService(
            join(serverDistFolder, 'data'),
            appConfig.geminiApiKey,
            appConfig.elevenLabsApiKey,
            appConfig.inworldApiKey,
            appConfig.inworldSecret,
            appConfig.inworldVoices,
            appConfig.inworldVoicePersonalities,
            appConfig.categoryPriorities
        );
        return true;
    }
    return false;
}

// Try to initialize on startup (won't crash if keys missing)
initializeServices();

// No double declaration needed

function readResources(): any[] {
    try {
        return JSON.parse(readFileSync(resourcesFile, 'utf8')) as any[];
    } catch {
        return [];
    }
}

function writeResources(data: any[]) {
    writeFileSync(resourcesFile, JSON.stringify(data, null, 2));
}

app.use(express.json());

app.get('/session', async (req, res) => {
    console.log(
        'Received session request process.env.OPENAI_API_KEY',
        process.env['OPENAI_API_KEY'],
    );
    try {
        const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini-realtime-preview-2024-12-17',
                voice: 'shimmer',
            }),
        });
        const data = await r.json();

        console.log('Received session response', data);
        res.send(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Session fetch failed' });
    }
});

// Helper to mask API keys for display (first 4 + last 4 chars)
function maskKey(key?: string): string | undefined {
    if (!key || key.length < 12) return key ? '****' : undefined;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// API Configuration Endpoints
app.get('/api/config', (req, res) => {
    res.json({
        hasGemini: !!appConfig.geminiApiKey,
        hasElevenLabs: !!appConfig.elevenLabsApiKey,
        hasInworld: !!appConfig.inworldApiKey && !!appConfig.inworldSecret,
        hasAlpaca: !!appConfig.alpacaKeyId && !!appConfig.alpacaSecretKey,
        hasOpenAI: !!appConfig.openaiApiKey,
        servicesInitialized: !!newsService,
        // Masked key previews for comparison
        maskedKeys: {
            gemini: maskKey(appConfig.geminiApiKey),
            elevenLabs: maskKey(appConfig.elevenLabsApiKey),
            inworldApi: maskKey(appConfig.inworldApiKey),
            inworldSecret: maskKey(appConfig.inworldSecret),
            alpacaKeyId: maskKey(appConfig.alpacaKeyId),
            alpacaSecret: maskKey(appConfig.alpacaSecretKey),
            openai: maskKey(appConfig.openaiApiKey)
        }
    });
});

app.post('/api/config', (req, res) => {
    const { geminiApiKey, elevenLabsApiKey, inworldApiKey, inworldSecret, inworldVoices, inworldVoicePersonalities, categoryPriorities, alpacaKeyId, alpacaSecretKey, openaiApiKey } = req.body;

    if (geminiApiKey) {
        appConfig.geminiApiKey = geminiApiKey;
    }
    if (elevenLabsApiKey !== undefined) {
        appConfig.elevenLabsApiKey = elevenLabsApiKey || undefined;
    }
    if (inworldApiKey !== undefined) {
        appConfig.inworldApiKey = inworldApiKey || undefined;
    }
    if (inworldSecret !== undefined) {
        appConfig.inworldSecret = inworldSecret || undefined;
    }
    if (inworldVoices !== undefined) {
        appConfig.inworldVoices = inworldVoices || undefined;
    }
    if (inworldVoicePersonalities !== undefined) {
        appConfig.inworldVoicePersonalities = inworldVoicePersonalities || undefined;
    }
    if (categoryPriorities !== undefined) {
        appConfig.categoryPriorities = categoryPriorities || undefined;
    }
    // Alpaca Trading Bot keys
    if (alpacaKeyId !== undefined) {
        appConfig.alpacaKeyId = alpacaKeyId || undefined;
    }
    if (alpacaSecretKey !== undefined) {
        appConfig.alpacaSecretKey = alpacaSecretKey || undefined;
    }
    if (openaiApiKey !== undefined) {
        appConfig.openaiApiKey = openaiApiKey || undefined;
    }

    // Save to file
    saveConfig(appConfig);

    // Write trader environment file if Alpaca keys present
    if (appConfig.alpacaKeyId || appConfig.alpacaSecretKey || appConfig.openaiApiKey) {
        writeTraderEnv(appConfig);
    }

    // Reinitialize services
    const initialized = initializeServices();

    res.json({
        success: true,
        initialized,
        hasGemini: !!appConfig.geminiApiKey,
        hasElevenLabs: !!appConfig.elevenLabsApiKey,
        hasInworld: !!appConfig.inworldApiKey && !!appConfig.inworldSecret,
        hasAlpaca: !!appConfig.alpacaKeyId && !!appConfig.alpacaSecretKey,
        hasOpenAI: !!appConfig.openaiApiKey
    });
});

app.delete('/api/config', (req, res) => {
    appConfig = {};
    saveConfig(appConfig);
    newsService = null;
    res.json({ success: true, message: 'Configuration cleared' });
});

// --- Services Management API ---
const MANAGED_SERVICES = ['portal', 'alpaca-trader'];

function getServiceStatus(serviceName: string): { active: boolean; enabled: boolean; status: string } {
    try {
        const activeResult = execSync(`systemctl is-active ${serviceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
        const enabledResult = execSync(`systemctl is-enabled ${serviceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
        return {
            active: activeResult === 'active',
            enabled: enabledResult === 'enabled',
            status: activeResult
        };
    } catch {
        return { active: false, enabled: false, status: 'unknown' };
    }
}

app.get('/api/services', (req, res) => {
    const services = MANAGED_SERVICES.map(name => ({
        name,
        ...getServiceStatus(name)
    }));
    res.json(services);
});

app.post('/api/services/:name/:action', (req, res) => {
    const { name, action } = req.params;

    if (!MANAGED_SERVICES.includes(name)) {
        res.status(400).json({ error: `Unknown service: ${name}` });
        return;
    }

    const validActions = ['start', 'stop', 'restart', 'enable', 'disable'];
    if (!validActions.includes(action)) {
        res.status(400).json({ error: `Invalid action: ${action}` });
        return;
    }

    try {
        execSync(`sudo systemctl ${action} ${name}`, { encoding: 'utf8' });
        const status = getServiceStatus(name);
        res.json({ success: true, service: name, action, ...status });
    } catch (err: any) {
        console.error(`Service ${action} failed for ${name}:`, err);
        res.status(500).json({ error: `Failed to ${action} ${name}`, details: err.message });
    }
});

// --- Cron Management API ---
const systemCronFile = '/etc/cron.d/portal-jobs';

app.get('/api/cron/user', (req, res) => {
    try {
        const crontab = execSync('crontab -l 2>/dev/null || echo ""', { encoding: 'utf8' });
        res.json({ crontab: crontab.trim() });
    } catch (err: any) {
        res.json({ crontab: '', error: err.message });
    }
});

app.post('/api/cron/user', (req, res) => {
    try {
        const { crontab } = req.body;
        if (typeof crontab !== 'string') {
            res.status(400).json({ error: 'Invalid crontab content' });
            return;
        }
        // Write to temp file and install
        const tempFile = '/tmp/portal-crontab-' + Date.now();
        writeFileSync(tempFile, crontab + '\n');
        execSync(`crontab ${tempFile}`, { encoding: 'utf8' });
        execSync(`rm ${tempFile}`);
        res.json({ success: true, message: 'User crontab updated' });
    } catch (err: any) {
        console.error('Failed to update user crontab:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cron/system', (req, res) => {
    try {
        if (existsSync(systemCronFile)) {
            const crontab = readFileSync(systemCronFile, 'utf8');
            res.json({ crontab: crontab.trim() });
        } else {
            res.json({ crontab: '' });
        }
    } catch (err: any) {
        res.json({ crontab: '', error: err.message });
    }
});

app.post('/api/cron/system', (req, res) => {
    try {
        const { crontab } = req.body;
        if (typeof crontab !== 'string') {
            res.status(400).json({ error: 'Invalid crontab content' });
            return;
        }
        // Write via sudo
        const tempFile = '/tmp/portal-system-cron-' + Date.now();
        writeFileSync(tempFile, crontab + '\n');
        execSync(`sudo mv ${tempFile} ${systemCronFile} && sudo chmod 644 ${systemCronFile}`, { encoding: 'utf8' });
        res.json({ success: true, message: 'System crontab updated' });
    } catch (err: any) {
        console.error('Failed to update system crontab:', err);
        res.status(500).json({ error: err.message });
    }
});

// Trigger immediate news generation (for cron or manual use)
app.post('/api/news/generate', async (req, res) => {
    if (!newsService) {
        res.status(503).json({ error: 'News service not initialized. Check API keys.' });
        return;
    }
    try {
        console.log('Triggering news generation...');
        const briefing = await newsService.generateDailyBriefing(true); // force refresh
        res.json({ success: true, date: briefing.date, articlesCount: briefing.articles.length });
    } catch (err: any) {
        console.error('News generation failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Inworld Chat Assistant API ---
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Get system status for context injection
function getSystemStatus(): string {
    try {
        const cpuInfo = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'", { encoding: 'utf8' }).trim();
        const memInfo = execSync("free -m | awk 'NR==2{printf \"%sMB / %sMB\", $3, $2}'", { encoding: 'utf8' }).trim();
        const tempInfo = execSync("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.1fC\", $1/1000}'", { encoding: 'utf8' }).trim() || 'N/A';
        const uptime = execSync("uptime -p", { encoding: 'utf8' }).trim();

        // Get service statuses
        const services = ['portal', 'alpaca-trader', 'caddy'];
        const serviceStatus = services.map(s => {
            try {
                const active = execSync(`systemctl is-active ${s} 2>/dev/null`, { encoding: 'utf8' }).trim();
                return `${s}: ${active}`;
            } catch { return `${s}: inactive`; }
        }).join(', ');

        return `SYSTEM STATUS:
- CPU Usage: ${cpuInfo}%
- Memory: ${memInfo}
- Temperature: ${tempInfo}
- Uptime: ${uptime}
- Services: ${serviceStatus}`;
    } catch (e) {
        return 'System status unavailable';
    }
}

app.post('/api/chat/inworld', async (req, res) => {
    const { message, history = [] } = req.body as { message: string; history?: ChatMessage[] };

    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    // Use Gemini API (already configured for news)
    if (!appConfig.geminiApiKey) {
        res.status(503).json({ error: 'Gemini API not configured. Add key in Settings.' });
        return;
    }

    try {
        // Select persona from Inworld personality config (reuse for character consistency)
        let persona = { name: 'ARIA', personality: 'You are ARIA, an AI assistant for the Raspberry Pi portal. You are friendly, helpful, and technically knowledgeable.' };
        if (appConfig.inworldVoicePersonalities && appConfig.inworldVoicePersonalities.length > 0) {
            const p = appConfig.inworldVoicePersonalities[0];
            persona = { name: p.name, personality: p.personality };
        }

        // Get current system status
        const systemStatus = getSystemStatus();

        // Build conversation for Gemini
        const systemPrompt = `${persona.personality}

You are connected to a Raspberry Pi Zero 2 portal dashboard. You can provide information about the system status.

${systemStatus}

Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' })} (Hawaii Time)

Answer user questions helpfully while staying in character. Keep responses concise but informative. If asked about system status, use the information above.`;

        // Format history for Gemini
        const contents: { role: string; parts: { text: string }[] }[] = [];

        // Add conversation history
        for (const msg of history.slice(-10)) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${appConfig.geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            res.status(response.status).json({ error: `Chat API error: ${response.status}` });
            return;
        }

        const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const reply = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from assistant.';

        res.json({
            reply,
            persona: persona.name,
            systemStatus: systemStatus.split('\n').slice(1).join(', ').substring(0, 100)
        });
    } catch (err: any) {
        console.error('Chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Trading API ---
const contingentOrdersFile = join(os.homedir(), 'projects/trader/contingent_orders.json');

// Helper to make Alpaca API calls
async function alpacaRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    // Read API keys from trader config
    if (!existsSync(traderEnvFile)) {
        throw new Error(`Trader config file not found: ${traderEnvFile}`);
    }

    const envContent = readFileSync(traderEnvFile, 'utf8');
    console.log(`[Trading] Config file size: ${envContent.length} bytes, lines: ${envContent.split('\n').length}`);

    const keyMatch = envContent.match(/ALPACA_API_KEY_ID=(.+)/);
    const secretMatch = envContent.match(/ALPACA_API_SECRET_KEY=(.+)/);

    if (!keyMatch || !secretMatch) {
        const missing = [];
        if (!keyMatch) missing.push('ALPACA_API_KEY_ID');
        if (!secretMatch) missing.push('ALPACA_API_SECRET_KEY');
        console.log(`[Trading] File content preview: ${envContent.substring(0, 200)}`);
        throw new Error(`Missing Alpaca keys: ${missing.join(', ')}`);
    }

    const isPaper = true; // Always use paper for safety
    const baseUrl = isPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';

    const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
            'APCA-API-KEY-ID': keyMatch[1].trim(),
            'APCA-API-SECRET-KEY': secretMatch[1].trim(),
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`);
    }
    return response.json();
}

app.get('/api/trading/status', async (req, res) => {
    try {
        const [account, positions] = await Promise.all([
            alpacaRequest('/v2/account'),
            alpacaRequest('/v2/positions')
        ]);

        // Check if bot service is running
        let botRunning = false;
        try {
            const status = execSync('systemctl is-active alpaca-trader 2>/dev/null || true', { encoding: 'utf8' }).trim();
            botRunning = status === 'active';
        } catch { }

        res.json({
            botRunning,
            cash: parseFloat(account.cash),
            equity: parseFloat(account.equity),
            dayPL: parseFloat(account.equity) - parseFloat(account.last_equity),
            positions: positions.map((p: any) => ({
                symbol: p.symbol,
                qty: parseFloat(p.qty),
                current_price: parseFloat(p.current_price),
                avg_entry_price: parseFloat(p.avg_entry_price),
                unrealized_pl: parseFloat(p.unrealized_pl),
                unrealized_plpc: parseFloat(p.unrealized_plpc)
            })),
            lastUpdate: new Date().toISOString()
        });
    } catch (err: any) {
        console.error('Trading status error:', err);
        res.status(503).json({ error: err.message });
    }
});

app.get('/api/trading/contingent', (req, res) => {
    try {
        if (existsSync(contingentOrdersFile)) {
            const orders = JSON.parse(readFileSync(contingentOrdersFile, 'utf8'));
            res.json(orders);
        } else {
            res.json([]);
        }
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/trading/contingent', (req, res) => {
    try {
        const { symbol, condition, value, action, notional, qty_pct } = req.body;

        if (!symbol || !condition || !value || !action) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        let orders: any[] = [];
        if (existsSync(contingentOrdersFile)) {
            orders = JSON.parse(readFileSync(contingentOrdersFile, 'utf8'));
        }

        orders.push({
            symbol: symbol.toUpperCase(),
            condition,
            value: parseFloat(value),
            action,
            notional: notional ? parseFloat(notional) : 50,
            qty_pct: qty_pct ? parseFloat(qty_pct) : 100,
            created_at: new Date().toISOString()
        });

        writeFileSync(contingentOrdersFile, JSON.stringify(orders, null, 2));
        res.json({ success: true, orders });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/trading/contingent/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        if (existsSync(contingentOrdersFile)) {
            let orders = JSON.parse(readFileSync(contingentOrdersFile, 'utf8'));
            if (index >= 0 && index < orders.length) {
                orders.splice(index, 1);
                writeFileSync(contingentOrdersFile, JSON.stringify(orders, null, 2));
                res.json({ success: true, orders });
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } else {
            res.status(404).json({ error: 'No orders found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/update-repo', (req, res) => {
    const home = os.homedir();
    const repoUrl = 'https://github.com/yourusername/RaspberryZero2_Portal.git';
    const repoPath = join(home, 'RaspberryZero2_Portal');
    try {
        if (!existsSync(repoPath)) {
            execSync(`git clone ${repoUrl} ${repoPath}`);
        } else {
            execSync(`git -C ${repoPath} pull`, { stdio: 'inherit' });
        }
        const branch = `update-${Date.now()}`;
        execSync(`git -C ${repoPath} checkout -b ${branch}`);
        execSync(`git -C ${repoPath} add .`);
        execSync(`git -C ${repoPath} commit -m "Automated update"`);
        res.json({ message: 'Repository updated', branch });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update repository' });
    }
});

app.post('/api/deploy', (req, res) => {
    const home = os.homedir();
    const repoPath = join(home, 'RaspberryZero2_Portal');
    try {
        execSync('npm run build', { cwd: repoPath, stdio: 'inherit' });
        const distPath = join(repoPath, 'dist', 'raspberry-zero2-portal');
        execSync(`cp -r ${distPath}/* ${home}/`);
        res.json({ message: 'Deployment complete' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to deploy' });
    }
});

app.get('/api/resources', (req, res) => {
    const resources = readResources().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json(resources);
});

app.post('/api/resources', (req, res) => {
    const resources = readResources();
    const entry = {
        id: Date.now().toString(),
        content: req.body.content,
        createdAt: new Date().toISOString(),
    };
    resources.unshift(entry);
    writeResources(resources);
    res.json(entry);
});

app.delete('/api/resources/:id', (req, res) => {
    let resources = readResources();
    const id = req.params['id'];
    const beforeLength = resources.length;
    resources = resources.filter((r) => r.id !== id);
    writeResources(resources);
    res.json({ success: resources.length !== beforeLength });
});

// --- News API ---

app.get('/api/news', async (req, res) => {
    if (!newsService) {
        res.status(503).json({
            error: 'News service not configured',
            message: 'Please configure API keys in settings'
        });
        return;
    }
    try {
        // Pass ?force=true to regenerate
        const force = req.query['force'] === 'true';
        const briefing = await newsService.generateDailyBriefing(force);
        res.json(briefing);
    } catch (err) {
        console.error('News Error:', err);
        res.status(500).json({ error: 'Failed to generate briefing' });
    }
});

// Manual refresh endpoint (forces regeneration)
app.post('/api/news/refresh', async (req, res) => {
    if (!newsService) {
        res.status(503).json({
            error: 'News service not initialized',
            needsConfig: true,
            message: 'Please configure Gemini API key in settings'
        });
        return;
    }
    try {
        console.log('Manual news refresh triggered...');
        const briefing = await newsService.generateDailyBriefing(true); // force=true
        res.json(briefing);
    } catch (err) {
        console.error('News Refresh Error:', err);
        res.status(500).json({ error: 'Failed to regenerate briefing' });
    }
});

app.get('/api/audio/:filename', (req, res) => {
    // Serve audio files from the data directory
    const filePath = join(serverDistFolder, 'data/audio', req.params.filename);
    if (existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Audio not found');
    }
});

// News Sources (read-only, hardcoded)
app.get('/api/news/sources', (req, res) => {
    if (!newsService) {
        res.status(503).json({ error: 'News service not configured' });
        return;
    }
    res.json(newsService.getSources());
});

app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

app.get('**', (req, res, next) => {
    // Skip API routes - they should have been handled above
    if (req.url.startsWith('/api/')) {
        return next();
    }

    // Serve index.html for all other routes (SPA)
    res.sendFile(join(browserDistFolder, 'index.html'));
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = process.env['PORT'] || 4000;
    const host = '0.0.0.0'; // Bind to all interfaces for external access
    app.listen(Number(port), host, () => {
        console.log(`Node Express server listening on http://${host}:${port}`);
    });
}

export default app;
