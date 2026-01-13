import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Position {
  symbol: string;
  qty: number;
  current_price: number;
  avg_entry_price: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

interface TradingStatus {
  botRunning: boolean;
  positions: Position[];
  cash: number;
  equity: number;
  dayPL: number;
  lastUpdate: string;
}

@Component({
  selector: 'app-trading-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trading-widget">
      <div class="widget-header">
        <span class="title">📈 TRADING_STATUS</span>
        <span class="bot-status" [class.running]="status?.botRunning">
          {{ status?.botRunning ? '● ACTIVE' : '○ STOPPED' }}
        </span>
      </div>

      <div class="stats-row" *ngIf="status">
        <div class="stat">
          <span class="label">CASH</span>
          <span class="value">\${{ status.cash | number:'1.2-2' }}</span>
        </div>
        <div class="stat">
          <span class="label">EQUITY</span>
          <span class="value">\${{ status.equity | number:'1.2-2' }}</span>
        </div>
        <div class="stat">
          <span class="label">DAY P/L</span>
          <span class="value" [class.positive]="status.dayPL >= 0" [class.negative]="status.dayPL < 0">
            {{ status.dayPL >= 0 ? '+' : '' }}\${{ status.dayPL | number:'1.2-2' }}
          </span>
        </div>
      </div>

      <div class="positions-section" *ngIf="status?.positions?.length">
        <div class="section-label">POSITIONS ({{ status?.positions?.length }})</div>
        <div class="position-row" *ngFor="let pos of status?.positions">
          <span class="symbol">{{ pos.symbol }}</span>
          <span class="qty">{{ pos.qty | number:'1.2-2' }}</span>
          <span class="price">\${{ pos.current_price | number:'1.2-2' }}</span>
          <span class="pl" [class.positive]="pos.unrealized_pl >= 0" [class.negative]="pos.unrealized_pl < 0">
            {{ pos.unrealized_pl >= 0 ? '+' : '' }}{{ (pos.unrealized_plpc * 100) | number:'1.2-2' }}%
          </span>
        </div>
      </div>

      <div class="no-positions" *ngIf="status && !status.positions?.length">
        No open positions
      </div>

      <div class="loading" *ngIf="!status && !error">
        Loading trading data...
      </div>

      <div class="error" *ngIf="error">
        {{ error }}
      </div>

      <div class="widget-footer">
        <span class="last-update" *ngIf="status?.lastUpdate">
          {{ status?.lastUpdate }}
        </span>
        <button class="refresh-btn" (click)="loadStatus()" [disabled]="loading">
          ↻
        </button>
      </div>
    </div>
  `,
  styles: [`
    .trading-widget { border: 1px solid var(--border-color); padding: 10px; font-size: 0.85rem; }
    .widget-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--text-secondary); padding-bottom: 8px; margin-bottom: 10px; }
    .title { color: var(--text-highlight); font-weight: bold; }
    .bot-status { color: var(--text-secondary); font-size: 0.75rem; }
    .bot-status.running { color: #00ff88; }

    .stats-row { display: flex; gap: 15px; margin-bottom: 10px; }
    .stat { display: flex; flex-direction: column; }
    .stat .label { color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; }
    .stat .value { color: var(--text-primary); font-family: var(--font-mono); }
    .positive { color: #00ff88 !important; }
    .negative { color: var(--text-alert) !important; }

    .positions-section { margin-top: 10px; }
    .section-label { color: var(--text-secondary); font-size: 0.7rem; margin-bottom: 5px; }
    .position-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted var(--border-color); }
    .symbol { color: var(--text-highlight); min-width: 50px; }
    .qty, .price { color: var(--text-primary); font-family: var(--font-mono); }
    .pl { font-family: var(--font-mono); min-width: 60px; text-align: right; }

    .no-positions { color: var(--text-secondary); font-style: italic; }
    .loading { color: var(--text-secondary); }
    .error { color: var(--text-alert); font-size: 0.8rem; }

    .widget-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--text-secondary); }
    .last-update { color: var(--text-secondary); font-size: 0.7rem; }
    .refresh-btn { background: transparent; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 2px 8px; cursor: pointer; }
    .refresh-btn:hover { background: var(--text-secondary); color: black; }
  `]
})
export class TradingStatusComponent implements OnInit, OnDestroy {
  status: TradingStatus | null = null;
  loading = false;
  error: string | null = null;
  private refreshInterval: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadStatus();
    // Auto-refresh every 60 seconds
    this.refreshInterval = setInterval(() => this.loadStatus(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadStatus() {
    this.loading = true;
    this.error = null;

    this.http.get<TradingStatus>('/api/trading/status').subscribe({
      next: (data) => {
        this.status = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        // Show actual error message from server
        this.error = err.error?.error || err.error?.message ||
          (err.status === 503 ? 'Trading not configured' : 'Failed to load status');
      }
    });
  }
}
