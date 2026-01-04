
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-news-widget',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <section class="widget news glass-panel">
      <h2>
        <span>📰 AI Briefing</span>
        <div class="header-actions">
          <button class="icon-btn" (click)="toggleAudio()" [disabled]="!briefing?.audioPlaylist?.length">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <a routerLink="/news-settings" class="settings-link" title="Configure Sources">⚙️</a>
        </div>
      </h2>
      
      <div *ngIf="loading" class="loading">
        <span class="spinner">↻</span> Generating briefing...
      </div>
      
      <div *ngIf="briefing">
        <ul class="summary-list">
          <li *ngFor="let line of summaryLines">{{ line }}</li>
        </ul>
        <div class="actions">
            <!-- Reuse global link style if possible or keep simple -->
            <a routerLink="/news" class="read-more">Read Full Briefing →</a>
        </div>
      </div>
       
      <div *ngIf="!loading && !briefing" class="setup-notice">
        <p *ngIf="needsConfig; else genericError">
          AI News requires an OpenAI key to summarize.
          <br>
          <a routerLink="/admin" class="setup-link">Click here to set it up</a>
        </p>
        <ng-template #genericError>
          <p>Could not load news. Check your connection.</p>
        </ng-template>
      </div>

      <audio #audioPlayer [src]="currentAudioSrc" (ended)="onAudioEnded()" (error)="onAudioError($event)"></audio>
      
      <div *ngIf="currentTrackIndex >= 0" class="now-playing">
        <span class="music-icon">🎵</span> Now Playing: {{ briefing?.audioPlaylist?.[currentTrackIndex]?.title }}
      </div>
    </section>
  `,
    styles: [`
    :host { display: block; }
    h2 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 0 16px 0 !important; /* Override global slightly if needed */
        font-size: 1.2rem;
        color: var(--accent-color);
    }
    .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }
    .icon-btn { 
        background: rgba(255,255,255,0.1); 
        border: 1px solid rgba(255,255,255,0.2);
        color: white; border-radius: 50%; width: 32px; height: 32px; 
        cursor: pointer; display: inline-flex; 
        align-items: center; justify-content: center; font-size: 0.9rem; 
        transition: all 0.2s;
    }
    .icon-btn:hover { background: var(--accent-color); border-color: var(--accent-color); }
    .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; background: transparent; }
    
    .settings-link {
        font-size: 1.2rem;
        color: rgba(255,255,255,0.5);
        text-decoration: none;
        transition: all 0.2s;
        display: inline-flex;
    }
    .settings-link:hover {
        color: var(--accent-color);
        transform: rotate(30deg);
    }
    
    .loading { 
        font-size: 0.9rem; color: var(--text-secondary); 
        padding: 20px 0; text-align: center; 
    }
    .spinner { display: inline-block; animation: spin 1s linear infinite; margin-right: 8px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .summary-list { 
        list-style-type: none; padding: 0; margin: 0; 
        font-size: 0.95rem; line-height: 1.6; color: var(--text-primary);
    }
    .summary-list li { 
        margin-bottom: 10px; padding-left: 20px; position: relative; 
    }
    .summary-list li::before {
        content: "•"; position: absolute; left: 0; color: var(--accent-color); font-weight: bold;
    }
    
    .read-more { 
        display: inline-block; margin-top: 10px; color: var(--accent-color); 
        text-decoration: none; font-size: 0.9rem; font-weight: 500;
        transition: color 0.2s;
    }
    .read-more:hover { color: #fff; text-decoration: underline; }
    
    .now-playing { 
        font-size: 0.8rem; color: var(--success-color); margin-top: 15px; 
        padding-top: 10px; border-top: 1px solid var(--glass-border);
        display: flex; align-items: center; gap: 8px;
    }
    
    .setup-notice {
        font-size: 0.9rem; color: var(--text-secondary); text-align: center;
        padding: 20px; border-radius: 8px; border: 1px dashed var(--glass-border);
        background: rgba(0,0,0,0.1);
    }
    .setup-link {
        color: var(--accent-color); font-weight: bold; text-decoration: none;
        display: inline-block; margin-top: 5px;
    }
    .setup-link:hover { text-decoration: underline; }
  `]
})
export class NewsWidgetComponent implements OnInit, OnDestroy {
    briefing: any = null;
    loading = true;
    needsConfig = false;
    summaryLines: string[] = [];

    isPlaying = false;
    currentTrackIndex = -1;
    currentAudioSrc = '';

    @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

    // To update date
    private pollInterval: any;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.fetchNews();
    }

    ngOnDestroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    fetchNews() {
        this.http.get('/api/news').subscribe({
            next: (data: any) => {
                this.briefing = data;
                this.processSummary();
                this.loading = false;
                this.needsConfig = false;
            },
            error: (err: any) => {
                console.error("News fetch failed", err);
                if (err.status === 503) {
                    this.needsConfig = true;
                }
                this.loading = false;
            }
        });
    }

    processSummary() {
        if (this.briefing?.summaryText) {
            // Filter out headers, take first 5 bullets for the widget
            const lines = this.briefing.summaryText.split('\n');
            this.summaryLines = lines
                .filter((l: string) => l.trim() && !l.trim().startsWith('#'))
                .map((l: string) => l.trim().replace(/^[-*•]\s*/, ''))
                .filter((l: string) => l && l.length > 5)
                .slice(0, 5);
        }
    }

    toggleAudio() {
        if (!this.audioPlayer) return;
        const player = this.audioPlayer.nativeElement;

        if (this.isPlaying) {
            player.pause();
            this.isPlaying = false;
        } else {
            if (this.currentTrackIndex === -1 && this.briefing?.audioPlaylist?.length) {
                this.playTrack(0);
            } else {
                player.play().catch(e => console.error(e));
                this.isPlaying = true;
            }
        }
    }

    playTrack(index: number) {
        if (!this.briefing?.audioPlaylist?.[index]) {
            this.isPlaying = false;
            this.currentTrackIndex = -1;
            return;
        }
        this.currentTrackIndex = index;
        const track = this.briefing.audioPlaylist[index];
        this.currentAudioSrc = track.url;

        // Allow angular binding update then play
        setTimeout(() => {
            if (this.audioPlayer) {
                this.audioPlayer.nativeElement.load();
                this.audioPlayer.nativeElement.play().catch(e => console.error("Play failed", e));
                this.isPlaying = true;
            }
        }, 50);
    }

    onAudioEnded() {
        this.playTrack(this.currentTrackIndex + 1);
    }

    onAudioError(e: any) {
        console.error("Audio error", e);
        // Skip defective track
        this.playTrack(this.currentTrackIndex + 1);
    }
}
