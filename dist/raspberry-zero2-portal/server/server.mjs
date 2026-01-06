// Moved import to avoid Angular dependency
import express from 'express';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import { NewsService } from './news.mjs';
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const app = express();
const resourcesFile = join(os.homedir(), '.portal-resources.json');
const configFile = join(os.homedir(), '.portal-config.json');
function readConfig() {
    try {
        if (existsSync(configFile)) {
            return JSON.parse(readFileSync(configFile, 'utf8'));
        }
    }
    catch (e) {
        console.error('Error reading config:', e);
    }
    return {};
}
function saveConfig(config) {
    writeFileSync(configFile, JSON.stringify(config, null, 2));
}
// Initialize config from env or file
let appConfig = readConfig();
if (process.env['GEMINI_API_KEY'] && !appConfig.geminiApiKey) {
    appConfig.geminiApiKey = process.env['GEMINI_API_KEY'];
}
if (process.env['ELEVENLABS_API_KEY'] && !appConfig.elevenLabsApiKey) {
    appConfig.elevenLabsApiKey = process.env['ELEVENLABS_API_KEY'];
}
// Lazy initialization - only create when keys available
let newsService = null;
function initializeServices() {
    if (appConfig.geminiApiKey) {
        newsService = new NewsService(join(serverDistFolder, 'data'), appConfig.geminiApiKey, appConfig.elevenLabsApiKey, appConfig.inworldApiKey, appConfig.inworldSecret);
        return true;
    }
    return false;
}
// Try to initialize on startup (won't crash if keys missing)
initializeServices();
// No double declaration needed
function readResources() {
    try {
        return JSON.parse(readFileSync(resourcesFile, 'utf8'));
    }
    catch {
        return [];
    }
}
function writeResources(data) {
    writeFileSync(resourcesFile, JSON.stringify(data, null, 2));
}
app.use(express.json());
app.get('/session', async (req, res) => {
    console.log('Received session request process.env.OPENAI_API_KEY', process.env['OPENAI_API_KEY']);
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Session fetch failed' });
    }
});
// API Configuration Endpoints
app.get('/api/config', (req, res) => {
    res.json({
        hasGemini: !!appConfig.geminiApiKey,
        hasElevenLabs: !!appConfig.elevenLabsApiKey,
        hasInworld: !!appConfig.inworldApiKey && !!appConfig.inworldSecret,
        servicesInitialized: !!newsService
    });
});
app.post('/api/config', (req, res) => {
    const { geminiApiKey, elevenLabsApiKey, inworldApiKey, inworldSecret } = req.body;
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
    // Save to file
    saveConfig(appConfig);
    // Reinitialize services
    const initialized = initializeServices();
    res.json({
        success: true,
        initialized,
        hasGemini: !!appConfig.geminiApiKey,
        hasElevenLabs: !!appConfig.elevenLabsApiKey,
        hasInworld: !!appConfig.inworldApiKey && !!appConfig.inworldSecret
    });
});
app.delete('/api/config', (req, res) => {
    appConfig = {};
    saveConfig(appConfig);
    newsService = null;
    res.json({ success: true, message: 'Configuration cleared' });
});
app.post('/api/update-repo', (req, res) => {
    const home = os.homedir();
    const repoUrl = 'https://github.com/yourusername/RaspberryZero2_Portal.git';
    const repoPath = join(home, 'RaspberryZero2_Portal');
    try {
        if (!existsSync(repoPath)) {
            execSync(`git clone ${repoUrl} ${repoPath}`);
        }
        else {
            execSync(`git -C ${repoPath} pull`, { stdio: 'inherit' });
        }
        const branch = `update-${Date.now()}`;
        execSync(`git -C ${repoPath} checkout -b ${branch}`);
        execSync(`git -C ${repoPath} add .`);
        execSync(`git -C ${repoPath} commit -m "Automated update"`);
        res.json({ message: 'Repository updated', branch });
    }
    catch (err) {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to deploy' });
    }
});
app.get('/api/resources', (req, res) => {
    const resources = readResources().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.error('News Refresh Error:', err);
        res.status(500).json({ error: 'Failed to regenerate briefing' });
    }
});
app.get('/api/audio/:filename', (req, res) => {
    // Serve audio files from the data directory
    const filePath = join(serverDistFolder, 'data/audio', req.params.filename);
    if (existsSync(filePath)) {
        res.sendFile(filePath);
    }
    else {
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
app.use(express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
}));
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
    app.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}
export default app;
