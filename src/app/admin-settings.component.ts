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
        <!-- OpenAI Configuration -->
        <div class="config-card glass-panel">
          <div class="card-header">
            <h2>🤖 OpenAI API Key</h2>
            <span class="badge" [class.active]="configStatus.hasOpenAI">
              {{ configStatus.hasOpenAI ? 'Configured' : 'Not Set' }}
            </span>
          </div>
          <p class="description">
            Required for news summarization and AI features.
            Get your key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>.
          </p>
          <div class="input-group">
            <input 
              type="password" 
              [(ngModel)]="openaiKey" 
              placeholder="sk-..."
              [class.configured]="configStatus.hasOpenAI"
            />
            <button class="show-btn" (click)="toggleOpenAIVisibility()">
              {{ showOpenAI ? '🙈' : '👁️' }}
            </button>
          </div>
          <div class="key-display" *ngIf="showOpenAI && openaiKey">
            <code>{{ openaiKey }}</code>
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
            Alternative for AI voice narration.
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
            <h2>🗣️ Inworld TTS (Preferred)</h2>
            <span class="badge optional" [class.active]="configStatus.hasInworld">
              {{ configStatus.hasInworld ? 'Configured' : 'Optional' }}
            </span>
          </div>
          <p class="description">
            Primary engine for speech synthesis.
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
        </div>
      </div>

      <div class="actions">
        <button class="save-btn" (click)="saveConfig()" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
        <button class="clear-btn" (click)="clearConfig()" *ngIf="configStatus.hasOpenAI || configStatus.hasElevenLabs || configStatus.hasInworld">
          Clear All Keys
        </button>
      </div>

      <div class="info-box glass-panel">
        <h3>🔒 Security Note</h3>
        <p>API keys are stored server-side in <code>config.json</code>. This is a private dashboard - ensure your Raspberry Pi is on a secure network.</p>
        <p><strong>Never share your API keys publicly!</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      color: var(--text-primary);
    }
    /* ... (styles start same) ... */
    
    .settings-header {
      margin-bottom: 30px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 10px;
    }
    
    .back-link {
      color: var(--accent-color);
      text-decoration: none;
      font-size: 0.9rem;
      display: inline-block;
      margin-bottom: 15px;
    }
    
    h1 { font-size: 2.2rem; margin: 0; }
    .subtitle { color: var(--text-secondary); font-size: 1rem; margin: 5px 0 0; }
    
    .config-status {
      padding: 15px 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
      border-left: 4px solid #ff6b6b;
    }
    
    .config-status.configured {
      border-left-color: var(--success-color);
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ff6b6b;
      box-shadow: 0 0 10px #ff6b6b;
      animation: pulse 2s infinite;
    }
    
    .config-status.configured .status-indicator {
      background: var(--success-color);
      box-shadow: 0 0 10px var(--success-color);
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }
    
    .settings-grid {
      display: grid;
      gap: 25px;
      margin-bottom: 30px;
    }
    
    .config-card {
      padding: 25px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    h2 { font-size: 1.2rem; margin: 0; }
    
    .badge {
      font-size: 0.7rem;
      padding: 4px 10px;
      border-radius: 10px;
      background: rgba(255, 107, 107, 0.1);
      color: #ff6b6b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid rgba(255, 107, 107, 0.2);
    }
    
    .badge.active {
      background: rgba(81, 207, 102, 0.1);
      color: var(--success-color);
      border-color: rgba(81, 207, 102, 0.2);
    }
    
    .badge.optional {
      background: rgba(255, 169, 77, 0.1);
      color: #ffa94d;
      border-color: rgba(255, 169, 77, 0.2);
    }
    
    .description {
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    
    .description a {
      color: var(--accent-color);
      text-decoration: underline;
    }
    
    .input-group {
      display: flex;
      gap: 10px;
    }
    
    input {
      flex: 1;
      padding: 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      transition: all 0.2s;
    }
    
    input:focus {
      outline: none;
      border-color: var(--accent-color);
      background: rgba(0,0,0,0.3);
    }
    
    .show-btn {
      padding: 10px 15px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
    }
    
    .key-display {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      word-break: break-all;
      font-size: 0.8rem;
      border: 1px dashed var(--glass-border);
    }
    
    .actions {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .save-btn {
      flex: 1;
      padding: 15px;
      background: var(--accent-gradient);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .save-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .clear-btn {
      padding: 15px 25px;
      background: rgba(255, 107, 107, 0.1);
      border: 1px solid rgba(255, 107, 107, 0.3);
      border-radius: 8px;
      color: #ff6b6b;
      cursor: pointer;
    }
    
    .info-box {
      padding: 20px;
    }
    
    .info-box h3 { margin-top: 0; color: var(--accent-color); font-size: 1.1rem; }
    .info-box p { color: var(--text-secondary); font-size: 0.9rem; margin: 8px 0; }
    code { background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 4px; font-family: monospace; }
  `]
})
export class AdminSettingsComponent implements OnInit {
  openaiKey = '';
  elevenLabsKey = '';
  inworldApiKey = '';
  inworldSecret = '';

  showOpenAI = false;
  showElevenLabs = false;
  saving = false;

  configStatus = {
    hasOpenAI: false,
    hasElevenLabs: false,
    hasInworld: false,
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

  toggleOpenAIVisibility() {
    this.showOpenAI = !this.showOpenAI;
  }

  toggleElevenLabsVisibility() {
    this.showElevenLabs = !this.showElevenLabs;
  }

  saveConfig() {
    if (!this.openaiKey && !this.inworldApiKey && !this.elevenLabsKey) {
      // Just check if we are clearing? 
    }

    this.saving = true;
    const payload: any = {};

    if (this.openaiKey) payload.openaiApiKey = this.openaiKey;
    if (this.elevenLabsKey) payload.elevenLabsApiKey = this.elevenLabsKey;
    if (this.inworldApiKey) payload.inworldApiKey = this.inworldApiKey;
    if (this.inworldSecret) payload.inworldSecret = this.inworldSecret;

    this.http.post<any>('/api/config', payload).subscribe({
      next: (data) => {
        this.saving = false;
        this.configStatus = data;
        this.openaiKey = '';
        this.elevenLabsKey = '';
        this.inworldApiKey = '';
        this.inworldSecret = '';

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
        this.openaiKey = '';
        this.elevenLabsKey = '';
        this.inworldApiKey = '';
        this.inworldSecret = '';
        this.configStatus = {
          hasOpenAI: false,
          hasElevenLabs: false,
          hasInworld: false,
          servicesInitialized: false
        };
        alert('Configuration cleared');
      },
      error: (err) => console.error('Failed to clear config', err)
    });
  }
}
