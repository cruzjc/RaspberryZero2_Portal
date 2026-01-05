
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
        display: flex; justify-content: space-between; align-items: center;
        margin: 0 0 10px 0 !important; font-size: 1rem; color: var(--text-secondary);
        border-bottom: 1px dashed var(--text-secondary); padding-bottom: 5px;
    }
    .header-actions { display: flex; gap: 10px; }
    .icon-btn, .settings-link {
        background: black; border: 1px solid var(--text-secondary); color: var(--text-secondary);
        cursor: pointer; padding: 2px 8px; font-family: var(--font-mono); font-size: 0.8rem;
        text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
        height: auto; width: auto; border-radius: 0;
    }
    .icon-btn:hover, .settings-link:hover {
        background: var(--text-secondary); color: black;
    }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .loading { color: var(--text-secondary); text-align: center; padding: 10px; }
    .spinner { animation: blink 1s infinite; display: inline-block; }
    @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }

    .summary-list { list-style: none; padding: 0; margin: 0; }
    .summary-list li { margin-bottom: 8px; color: var(--text-primary); padding-left: 15px; position: relative; }
    .summary-list li::before { content: ">"; position: absolute; left: 0; color: var(--text-secondary); }

    .read-more { display: inline-block; margin-top: 10px; color: var(--text-secondary); text-decoration: none; border: 1px solid var(--text-secondary); padding: 2px 5px; }
    .read-more:hover { background: var(--text-secondary); color: black; }

    .now-playing { color: var(--text-highlight); margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 5px; }

    .setup-notice { border: 1px solid var(--text-alert); padding: 10px; color: var(--text-alert); text-align: center; margin-top: 10px; }
    .setup-link { color: var(--text-alert); text-decoration: underline; font-weight: bold; }
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
