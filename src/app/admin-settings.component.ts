import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="settings-container">
      <header class="settings-header">
        <a routerLink="/" class="back-link">← Back to Dashboard</a>
        <h1>⚙️ Admin Settings</h1>
        <p class="subtitle">Configure your AI service API keys</p>
      </header>

      <div class="config-status glass-panel" [class.configured]="configStatus.servicesInitialized">
        <div class="status-indicator"></div>
        <div class="status-text">
          <strong>Status:</strong> 
          {{ configStatus.servicesInitialized ? 'Services Active ✓' : 'Not Configured' }}
        </div>
      </div>

      <div class="settings-grid">
        <!-- Gemini Configuration -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>✨ Gemini API Key</h2>
            <span class="badge" [class.active]="configStatus.hasGemini">
              {{ configStatus.hasGemini ? 'Configured' : 'Required' }}
            </span>
          </div>
          <p class="description">
            Required for AI news summarization (gemini-2.0-flash).
            Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.
          </p>
          <div class="input-group">
            <input 
              type="password" 
              [(ngModel)]="geminiKey" 
              placeholder="AIza..."
              [class.configured]="configStatus.hasGemini"
            />
            <button class="show-btn" (click)="toggleGeminiVisibility()">
              {{ showGemini ? '🙈' : '👁️' }}
            </button>
          </div>
          <div class="key-display" *ngIf="showGemini && geminiKey">
            <code>{{ geminiKey }}</code>
          </div>
        </div>

        <!-- ElevenLabs Configuration -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>🎙️ ElevenLabs API Key</h2>
            <span class="badge optional" [class.active]="configStatus.hasElevenLabs">
              {{ configStatus.hasElevenLabs ? 'Configured' : 'Optional' }}
            </span>
          </div>
          <p class="description">
            For AI voice chatbot (ESTABLISH_LINK button).
            Get your key from <a href="https://elevenlabs.io/" target="_blank">ElevenLabs</a>.
          </p>
          <div class="input-group">
            <input 
              type="password" 
              [(ngModel)]="elevenLabsKey" 
              placeholder="Optional"
              [class.configured]="configStatus.hasElevenLabs"
            />
            <button class="show-btn" (click)="toggleElevenLabsVisibility()">
              {{ showElevenLabs ? '🙈' : '👁️' }}
            </button>
          </div>
          <div class="key-display" *ngIf="showElevenLabs && elevenLabsKey">
            <code>{{ elevenLabsKey }}</code>
          </div>
        </div>

        <!-- Inworld Configuration -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>🗣️ Inworld TTS</h2>
            <span class="badge optional" [class.active]="configStatus.hasInworld">
              {{ configStatus.hasInworld ? 'Configured' : 'Optional' }}
            </span>
          </div>
          <p class="description">
            Text-to-speech for reading AI briefings.
            Get keys from <a href="https://inworld.ai/" target="_blank">Inworld Studio</a>.
          </p>
          <div class="input-group">
            <input 
              type="password" 
              [(ngModel)]="inworldApiKey" 
              placeholder="Inworld API Key"
              [class.configured]="configStatus.hasInworld"
            />
          </div>
          <div class="input-group" style="margin-top: 10px;">
            <input 
              type="password" 
              [(ngModel)]="inworldSecret" 
              placeholder="Inworld API Secret"
              [class.configured]="configStatus.hasInworld"
            />
          </div>
          <div class="voice-config" style="margin-top: 15px; border-top: 1px dashed var(--text-secondary); padding-top: 10px;">
            <label style="color: var(--text-secondary); font-size: 0.8rem; display: block; margin-bottom: 5px;">Voice IDs (legacy, comma-separated):</label>
            <textarea 
              [(ngModel)]="inworldVoices" 
              placeholder="default-w5tqexcshinf-_u9dgvlow__lappland_the_decadenza, default-w5tqexcshinf-_u9dgvlow__bagpipe"
              style="width: 100%; background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 8px; font-family: var(--font-mono); min-height: 40px; resize: vertical;"
            ></textarea>
          </div>
          <div class="personality-config" style="margin-top: 15px; border-top: 1px dashed var(--text-secondary); padding-top: 10px;">
            <label style="color: var(--text-highlight); font-size: 0.9rem; display: block; margin-bottom: 5px;">🎭 Voice Personalities (JSON):</label>
            <textarea 
              [(ngModel)]="voicePersonalitiesJson" 
              placeholder='[{"voiceId": "lappland...", "name": "Lappland", "personality": "You are Lappland, a chaotic news anchor..."}]'
              style="width: 100%; background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 8px; font-family: var(--font-mono); min-height: 80px; resize: vertical;"
            ></textarea>
            <p style="color: var(--text-secondary); font-size: 0.7rem; margin-top: 5px;">Each personality has voiceId, name, and personality prompt for Gemini summarization.</p>
          </div>
        </div>

        <!-- Category Priorities -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>📰 Category Priorities</h2>
          </div>
          <p class="description">
            Order determines which categories appear first in summaries. Comma-separated.
          </p>
          <div class="input-group">
            <textarea 
              [(ngModel)]="categoryPrioritiesStr" 
              placeholder="Breaking News, AI, Tech, Local, World, Business, Science, Finance, Politics, Health"
              style="width: 100%; background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 8px; font-family: var(--font-mono); min-height: 60px; resize: vertical;"
            ></textarea>
          </div>
        </div>

        <!-- Alpaca Trading Bot -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>📈 Alpaca Trading Bot</h2>
            <span class="badge optional" [class.active]="configStatus.hasAlpaca">
              {{ configStatus.hasAlpaca ? 'Configured' : 'Optional' }}
            </span>
          </div>
          <p class="description">
            API keys for the AI trading bot. Get keys from <a href="https://alpaca.markets/" target="_blank">Alpaca</a>.
          </p>
          <div class="input-group">
            <input 
              type="password" 
              [(ngModel)]="alpacaKeyId" 
              placeholder="Alpaca API Key ID (PK...)"
              [class.configured]="configStatus.hasAlpaca"
            />
          </div>
          <div class="input-group" style="margin-top: 10px;">
            <input 
              type="password" 
              [(ngModel)]="alpacaSecretKey" 
              placeholder="Alpaca Secret Key"
              [class.configured]="configStatus.hasAlpaca"
            />
          </div>
          <div class="input-group" style="margin-top: 15px; border-top: 1px dashed var(--text-secondary); padding-top: 10px;">
            <input 
              type="password" 
              [(ngModel)]="openaiApiKey" 
              placeholder="OpenAI API Key (for trader AI decisions)"
              [class.configured]="configStatus.hasOpenAI"
            />
          </div>
          <p style="color: var(--text-secondary); font-size: 0.7rem; margin-top: 5px;">Saved to ~/.trader-config.env for the trading service.</p>
        </div>
      </div>

      <div class="actions">
        <button class="save-btn" (click)="saveConfig()" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
        <button class="clear-btn" (click)="clearConfig()" *ngIf="configStatus.hasGemini || configStatus.hasElevenLabs || configStatus.hasInworld">
          Clear All Keys
        </button>
      </div>

      <div class="info-box glass-panel">
        <h3>🔒 Security Note</h3>
        <p>API keys are stored server-side in <code>~/.portal-config.json</code>. This is a private dashboard - ensure your Raspberry Pi is on a secure network.</p>
        <p><strong>Never share your API keys publicly!</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .settings-container { padding: 10px; color: var(--text-primary); }
    .settings-header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--text-secondary); padding-bottom: 15px; margin-bottom: 20px; }
    .back-link { border: 1px solid var(--text-secondary); padding: 5px; color: var(--text-secondary); text-decoration: none; display: inline-block; }
    h1 { margin: 0; font-size: 1.5rem; text-transform: uppercase; color: var(--text-primary); }
    .subtitle { margin: 5px 0 0 0; color: var(--text-secondary); }

    .config-status { border: 1px solid var(--text-secondary); padding: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .config-status.configured { border-color: var(--text-primary); }
    .status-indicator { width: 10px; height: 10px; background: var(--text-alert); }
    .config-status.configured .status-indicator { background: var(--text-primary); }

    .settings-grid { display: grid; gap: 20px; }
    .config-card { border: 1px solid var(--border-color); padding: 10px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--text-secondary); padding-bottom: 5px; margin-bottom: 10px; }
    h2 { font-size: 1rem; color: var(--text-highlight); margin: 0; }
    .badge { border: 1px solid var(--text-secondary); padding: 2px 5px; font-size: 0.7rem; text-transform: uppercase; }
    .badge.active { background: var(--text-primary); color: black; border-color: var(--text-primary); }

    .description { color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 10px; }
    .description a { color: var(--text-primary); }

    .input-group { display: flex; gap: 5px; margin-bottom: 5px; }
    input { background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 8px; flex: 1; font-family: var(--font-mono); }
    input:focus { border-color: var(--text-primary); outline: none; }
    
    .show-btn { background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); cursor: pointer; padding: 0 10px; }
    .key-display { border: 1px dashed var(--text-secondary); padding: 5px; color: var(--text-secondary); font-size: 0.8rem; margin-top: 5px; word-break: break-all; }

    .actions { display: flex; gap: 10px; margin-top: 20px; }
    .save-btn { flex: 1; background: var(--text-primary); color: black; border: 1px solid var(--text-primary); padding: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
    .save-btn:hover { background: black; color: var(--text-primary); }
    .clear-btn { background: black; color: var(--text-alert); border: 1px solid var(--text-alert); padding: 10px; cursor: pointer; text-transform: uppercase; }
    .clear-btn:hover { background: var(--text-alert); color: black; }

    .info-box { border: 1px solid var(--text-secondary); padding: 10px; }
    .info-box h3 { color: var(--text-alert); margin-top: 0; font-size: 1rem; }
    .info-box p { font-size: 0.8rem; color: var(--text-secondary); }
    code { color: var(--text-primary); }
  `]
})
export class AdminSettingsComponent implements OnInit {
  geminiKey = '';
  elevenLabsKey = '';
  inworldApiKey = '';
  inworldSecret = '';
  inworldVoices = '';
  voicePersonalitiesJson = '';
  categoryPrioritiesStr = 'Breaking News, AI, Tech, Local, World, Business, Science, Finance, Politics, Health';
  // Alpaca Trading Bot
  alpacaKeyId = '';
  alpacaSecretKey = '';
  openaiApiKey = '';

  showGemini = false;
  showElevenLabs = false;
  saving = false;

  configStatus = {
    hasGemini: false,
    hasElevenLabs: false,
    hasInworld: false,
    hasAlpaca: false,
    hasOpenAI: false,
    servicesInitialized: false
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.http.get<any>('/api/config').subscribe({
      next: (data) => {
        this.configStatus = data;
      },
      error: (err) => console.error('Failed to load config', err)
    });
  }

  toggleGeminiVisibility() {
    this.showGemini = !this.showGemini;
  }

  toggleElevenLabsVisibility() {
    this.showElevenLabs = !this.showElevenLabs;
  }

  saveConfig() {
    this.saving = true;
    const payload: any = {};

    if (this.geminiKey) payload.geminiApiKey = this.geminiKey;
    if (this.elevenLabsKey) payload.elevenLabsApiKey = this.elevenLabsKey;
    if (this.inworldApiKey) payload.inworldApiKey = this.inworldApiKey;
    if (this.inworldSecret) payload.inworldSecret = this.inworldSecret;
    if (this.inworldVoices) payload.inworldVoices = this.inworldVoices;

    // Parse voice personalities JSON
    if (this.voicePersonalitiesJson.trim()) {
      try {
        payload.inworldVoicePersonalities = JSON.parse(this.voicePersonalitiesJson);
      } catch (e) {
        alert('Invalid Voice Personalities JSON. Please check the format.');
        this.saving = false;
        return;
      }
    }

    // Parse category priorities
    if (this.categoryPrioritiesStr.trim()) {
      payload.categoryPriorities = this.categoryPrioritiesStr.split(',').map(s => s.trim()).filter(s => s);
    }

    // Alpaca Trading Bot keys
    if (this.alpacaKeyId) payload.alpacaKeyId = this.alpacaKeyId;
    if (this.alpacaSecretKey) payload.alpacaSecretKey = this.alpacaSecretKey;
    if (this.openaiApiKey) payload.openaiApiKey = this.openaiApiKey;

    this.http.post<any>('/api/config', payload).subscribe({
      next: (data) => {
        this.saving = false;
        this.configStatus = data;
        this.geminiKey = '';
        this.elevenLabsKey = '';
        this.inworldApiKey = '';
        this.inworldSecret = '';
        this.alpacaKeyId = '';
        this.alpacaSecretKey = '';
        this.openaiApiKey = '';

        alert('✓ Configuration saved successfully!\n\nServices initialized: ' + (data.servicesInitialized ? 'Yes' : 'No'));
      },
      error: (err) => {
        this.saving = false;
        console.error('Failed to save config', err);
        alert('Failed to save configuration. Check console for details.');
      }
    });
  }

  clearConfig() {
    if (!confirm('Are you sure you want to clear all API keys?')) return;

    this.http.delete('/api/config').subscribe({
      next: () => {
        this.geminiKey = '';
        this.elevenLabsKey = '';
        this.inworldApiKey = '';
        this.inworldSecret = '';
        this.alpacaKeyId = '';
        this.alpacaSecretKey = '';
        this.openaiApiKey = '';
        this.configStatus = {
          hasGemini: false,
          hasElevenLabs: false,
          hasInworld: false,
          hasAlpaca: false,
          hasOpenAI: false,
          servicesInitialized: false
        };
        alert('Configuration cleared');
      },
      error: (err) => console.error('Failed to clear config', err)
    });
  }
}
