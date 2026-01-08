import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface ServiceStatus {
  name: string;
  active: boolean;
  enabled: boolean;
  status: string;
}

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="services-container">
      <header class="services-header">
        <a routerLink="/" class="back-link">← Back to Dashboard</a>
        <h1>🔧 Services Management</h1>
        <p class="subtitle">Control systemd services and cron jobs</p>
      </header>

      <!-- Services Section -->
      <div class="section-title-bar">SYSTEMD SERVICES</div>
      <div class="services-list">
        <div class="service-card glass-panel" *ngFor="let service of services">
          <div class="service-info">
            <div class="service-name">
              <span class="status-dot" [class.active]="service.active"></span>
              {{ service.name }}
            </div>
            <div class="service-status">
              <span class="badge" [class.active]="service.active">
                {{ service.status }}
              </span>
              <span class="badge enabled" [class.active]="service.enabled">
                {{ service.enabled ? 'Auto-start' : 'Manual' }}
              </span>
            </div>
          </div>
          <div class="service-actions">
            <button 
              class="action-btn start" 
              (click)="controlService(service.name, 'start')"
              [disabled]="loading[service.name] || service.active"
            >
              ▶ Start
            </button>
            <button 
              class="action-btn stop" 
              (click)="controlService(service.name, 'stop')"
              [disabled]="loading[service.name] || !service.active"
            >
              ⏹ Stop
            </button>
            <button 
              class="action-btn restart" 
              (click)="controlService(service.name, 'restart')"
              [disabled]="loading[service.name]"
            >
              🔄 Restart
            </button>
            <button 
              class="action-btn enable" 
              (click)="controlService(service.name, service.enabled ? 'disable' : 'enable')"
              [disabled]="loading[service.name]"
            >
              {{ service.enabled ? '🚫 Disable' : '✓ Enable' }}
            </button>
          </div>
          <div class="loading-indicator" *ngIf="loading[service.name]">
            Processing...
          </div>
        </div>
      </div>

      <!-- Cron Jobs Section -->
      <div class="section-title-bar">CRON JOBS</div>
      <div class="cron-section glass-panel">
        <div class="cron-tabs">
          <button 
            class="cron-tab" 
            [class.active]="cronTab === 'user'" 
            (click)="cronTab = 'user'; loadCron('user')"
          >
            👤 User Crontab
          </button>
          <button 
            class="cron-tab" 
            [class.active]="cronTab === 'system'" 
            (click)="cronTab = 'system'; loadCron('system')"
          >
            🖥️ System Crontab
          </button>
        </div>

        <div class="cron-editor">
          <div class="cron-help">
            Format: minute hour day month weekday command<br>
            Example: 0 3 * * * /usr/bin/command (runs daily at 3am)
          </div>
          <textarea 
            [(ngModel)]="cronContent" 
            class="cron-textarea"
            placeholder="# No cron jobs configured"
            [disabled]="cronLoading"
          ></textarea>
          <div class="cron-actions">
            <button class="action-btn" (click)="saveCron()" [disabled]="cronLoading || cronSaving">
              {{ cronSaving ? 'Saving...' : '💾 Save Crontab' }}
            </button>
            <button class="action-btn news-job" (click)="addNewsJob()" [disabled]="cronLoading">
              📰 Add 3am News Job
            </button>
            <button class="action-btn" (click)="loadCron(cronTab)" [disabled]="cronLoading">
              🔄 Reload
            </button>
          </div>
          <div class="cron-status" *ngIf="cronMessage">{{ cronMessage }}</div>
        </div>
      </div>

      <div class="info-box glass-panel">
        <h3>ℹ️ About</h3>
        <ul>
          <li><strong>portal</strong> - The web dashboard you're using now</li>
          <li><strong>alpaca-trader</strong> - AI trading bot (requires API keys)</li>
          <li><strong>User crontab</strong> - Jobs run as your user account</li>
          <li><strong>System crontab</strong> - Jobs in /etc/cron.d/portal-jobs</li>
        </ul>
      </div>

      <div class="refresh-section">
        <button class="refresh-btn" (click)="loadServices()" [disabled]="refreshing">
          {{ refreshing ? 'Refreshing...' : '🔄 Refresh Status' }}
        </button>
        <span class="last-update" *ngIf="lastUpdate">
          Last updated: {{ lastUpdate | date:'HH:mm:ss' }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .services-container { padding: 10px; color: var(--text-primary); }
    .services-header { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--text-secondary); padding-bottom: 15px; margin-bottom: 20px; }
    .back-link { border: 1px solid var(--text-secondary); padding: 5px; color: var(--text-secondary); text-decoration: none; display: inline-block; }
    h1 { margin: 0; font-size: 1.5rem; text-transform: uppercase; color: var(--text-primary); }
    .subtitle { margin: 5px 0 0 0; color: var(--text-secondary); }

    .section-title-bar { background: var(--text-secondary); color: black; padding: 5px 10px; font-weight: bold; margin: 20px 0 10px 0; text-transform: uppercase; font-size: 0.85rem; }

    .services-list { display: flex; flex-direction: column; gap: 15px; }
    .service-card { border: 1px solid var(--border-color); padding: 15px; }
    
    .service-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .service-name { font-size: 1.2rem; font-weight: bold; color: var(--text-highlight); display: flex; align-items: center; gap: 10px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--text-alert); }
    .status-dot.active { background: #00ff88; box-shadow: 0 0 8px #00ff88; }

    .service-status { display: flex; gap: 8px; }
    .badge { border: 1px solid var(--text-secondary); padding: 3px 8px; font-size: 0.75rem; text-transform: uppercase; }
    .badge.active { background: var(--text-primary); color: black; border-color: var(--text-primary); }
    .badge.enabled { border-color: var(--text-highlight); color: var(--text-highlight); }
    .badge.enabled.active { background: var(--text-highlight); color: black; }

    .service-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .action-btn { background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 8px 12px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .action-btn:hover:not(:disabled) { background: var(--text-secondary); color: black; }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .action-btn.start { border-color: #00ff88; color: #00ff88; }
    .action-btn.start:hover:not(:disabled) { background: #00ff88; color: black; }
    .action-btn.stop { border-color: var(--text-alert); color: var(--text-alert); }
    .action-btn.stop:hover:not(:disabled) { background: var(--text-alert); color: black; }
    .action-btn.restart { border-color: var(--text-highlight); color: var(--text-highlight); }
    .action-btn.restart:hover:not(:disabled) { background: var(--text-highlight); color: black; }
    .action-btn.news-job { border-color: #ffcc00; color: #ffcc00; }
    .action-btn.news-job:hover:not(:disabled) { background: #ffcc00; color: black; }

    .loading-indicator { margin-top: 8px; color: var(--text-highlight); font-size: 0.8rem; }

    .cron-section { border: 1px solid var(--border-color); padding: 15px; }
    .cron-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
    .cron-tab { background: transparent; border: 1px solid var(--text-secondary); color: var(--text-secondary); padding: 8px 15px; cursor: pointer; }
    .cron-tab.active { background: var(--text-primary); color: black; border-color: var(--text-primary); }
    .cron-tab:hover:not(.active) { background: var(--text-secondary); color: black; }
    .cron-help { color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 10px; font-family: var(--font-mono); }
    .cron-textarea { width: 100%; height: 150px; background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); font-family: var(--font-mono); font-size: 0.85rem; padding: 10px; resize: vertical; }
    .cron-actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .cron-status { margin-top: 10px; color: var(--text-highlight); font-size: 0.85rem; }

    .info-box { border: 1px solid var(--text-secondary); padding: 15px; margin-top: 20px; }
    .info-box h3 { color: var(--text-highlight); margin-top: 0; font-size: 1rem; }
    .info-box ul { margin: 10px 0; padding-left: 20px; }
    .info-box li { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px; }
    .info-box strong { color: var(--text-primary); }

    .refresh-section { margin-top: 20px; display: flex; align-items: center; gap: 15px; }
    .refresh-btn { background: var(--text-primary); color: black; border: 1px solid var(--text-primary); padding: 10px 20px; cursor: pointer; font-weight: bold; text-transform: uppercase; }
    .refresh-btn:hover:not(:disabled) { background: black; color: var(--text-primary); }
    .refresh-btn:disabled { opacity: 0.5; }
    .last-update { color: var(--text-secondary); font-size: 0.8rem; }
  `]
})
export class ServicesManagementComponent implements OnInit, OnDestroy {
  services: ServiceStatus[] = [];
  loading: { [key: string]: boolean } = {};
  refreshing = false;
  lastUpdate: Date | null = null;
  private refreshInterval: any;

  // Cron state
  cronTab: 'user' | 'system' = 'user';
  cronContent = '';
  cronLoading = false;
  cronSaving = false;
  cronMessage = '';

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadServices();
    this.loadCron('user');
    this.refreshInterval = setInterval(() => this.loadServices(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadServices() {
    this.refreshing = true;
    this.http.get<ServiceStatus[]>('/api/services').subscribe({
      next: (data) => {
        this.services = data;
        this.lastUpdate = new Date();
        this.refreshing = false;
      },
      error: (err) => {
        console.error('Failed to load services', err);
        this.refreshing = false;
      }
    });
  }

  controlService(name: string, action: string) {
    this.loading[name] = true;
    this.http.post<any>(`/api/services/${name}/${action}`, {}).subscribe({
      next: (result) => {
        this.loading[name] = false;
        const service = this.services.find(s => s.name === name);
        if (service) {
          service.active = result.active;
          service.enabled = result.enabled;
          service.status = result.status;
        }
        this.lastUpdate = new Date();
      },
      error: (err) => {
        this.loading[name] = false;
        console.error(`Failed to ${action} service ${name}`, err);
        alert(`Failed to ${action} ${name}: ${err.error?.details || err.message}`);
      }
    });
  }

  loadCron(type: 'user' | 'system') {
    this.cronTab = type;
    this.cronLoading = true;
    this.cronMessage = '';
    this.http.get<{ crontab: string }>(`/api/cron/${type}`).subscribe({
      next: (data) => {
        this.cronContent = data.crontab || '';
        this.cronLoading = false;
      },
      error: (err) => {
        console.error('Failed to load crontab', err);
        this.cronContent = '';
        this.cronLoading = false;
        this.cronMessage = 'Failed to load crontab';
      }
    });
  }

  saveCron() {
    this.cronSaving = true;
    this.cronMessage = '';
    this.http.post<any>(`/api/cron/${this.cronTab}`, { crontab: this.cronContent }).subscribe({
      next: (result) => {
        this.cronSaving = false;
        this.cronMessage = '✓ Crontab saved successfully';
      },
      error: (err) => {
        this.cronSaving = false;
        this.cronMessage = '✗ Failed to save: ' + (err.error?.error || err.message);
      }
    });
  }

  addNewsJob() {
    const newsJob = '# Generate news briefing at 3am daily\n0 3 * * * /usr/bin/curl -s -X POST http://localhost:3000/api/news/generate > /dev/null 2>&1';
    if (this.cronContent.includes('api/news/generate')) {
      this.cronMessage = 'News job already exists in crontab';
      return;
    }
    this.cronContent = this.cronContent.trim() ? this.cronContent + '\n\n' + newsJob : newsJob;
    this.cronMessage = 'News job added - click Save to apply';
  }
}

