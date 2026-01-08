import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface ServiceStatus {
    name: string;
    active: boolean;
    enabled: boolean;
    status: string;
}

@Component({
    selector: 'app-services-management',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="services-container">
      <header class="services-header">
        <a routerLink="/" class="back-link">← Back to Dashboard</a>
        <h1>🔧 Services Management</h1>
        <p class="subtitle">Control systemd services on your Raspberry Pi</p>
      </header>

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

      <div class="info-box glass-panel">
        <h3>ℹ️ About Services</h3>
        <ul>
          <li><strong>portal</strong> - The web dashboard you're using now</li>
          <li><strong>alpaca-trader</strong> - AI trading bot (requires API keys configured)</li>
        </ul>
        <p>Auto-start services will start automatically when the Pi boots.</p>
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

    .loading-indicator { margin-top: 8px; color: var(--text-highlight); font-size: 0.8rem; }

    .info-box { border: 1px solid var(--text-secondary); padding: 15px; margin-top: 20px; }
    .info-box h3 { color: var(--text-highlight); margin-top: 0; font-size: 1rem; }
    .info-box ul { margin: 10px 0; padding-left: 20px; }
    .info-box li { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px; }
    .info-box strong { color: var(--text-primary); }
    .info-box p { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0; }

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

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadServices();
        // Auto-refresh every 30 seconds
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
                // Update the service in our list
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
}
