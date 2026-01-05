
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-news-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="widget news">
      <h2>
        <span>📰 AI Briefing</span>
        <div class="header-actions">
          <button class="action-btn" (click)="refreshNews()" [disabled]="loading">
            {{ loading ? '[ ... ]' : '[ REFRESH ]' }}
          </button>
          <button class="action-btn" (click)="toggleAudio()" [disabled]="!briefing?.audioPlaylist?.length">
            {{ isPlaying ? '[ STOP ]' : '[ NARRATE ]' }}
          </button>
        </div>
      </h2>
      
      <div *ngIf="loading" class="loading">
        <span class="spinner">↻</span> {{ loadingMessage }}
      </div>
      
      <!-- AI Summary View -->
      <div *ngIf="!loading && briefing && hasSummary">
        <div class="summary-header">AI Summary (Gemini)</div>
        <ul class="summary-list">
          <li *ngFor="let line of summaryLines">{{ line }}</li>
        </ul>
      </div>

      <!-- Fallback Headlines View (when no summary available) -->
      <div *ngIf="!loading && briefing && !hasSummary">
        <div class="summary-header">Headlines (Raw)</div>
        <ul class="headline-list">
          <li *ngFor="let article of displayArticles">
            <span class="category">[{{ article.category }}]</span>
            <span class="title">{{ article.title }}</span>
          </li>
        </ul>
        <div class="fallback-notice" *ngIf="needsConfig">
          ⚠ Configure Gemini API key for AI summaries
        </div>
      </div>
       
      <div *ngIf="!loading && !briefing" class="setup-notice">
        <p *ngIf="needsConfig; else genericError">
          AI News requires a Gemini API key to summarize.
          <br>
          <span class="setup-link">Configure in Settings → Admin Controls</span>
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
    .header-actions { display: flex; gap: 5px; }
    .action-btn {
        background: black; border: 1px solid var(--text-secondary); color: var(--text-secondary);
        cursor: pointer; padding: 2px 6px; font-family: var(--font-mono); font-size: 0.7rem;
        text-decoration: none;
    }
    .action-btn:hover { background: var(--text-secondary); color: black; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .loading { color: var(--text-secondary); text-align: center; padding: 10px; }
    .spinner { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .summary-header { color: var(--text-highlight); font-size: 0.8rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 3px; }

    .summary-list { list-style: none; padding: 0; margin: 0; }
    .summary-list li { margin-bottom: 8px; color: var(--text-primary); padding-left: 15px; position: relative; }
    .summary-list li::before { content: ">"; position: absolute; left: 0; color: var(--text-secondary); }

    .headline-list { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; }
    .headline-list li { margin-bottom: 5px; color: var(--text-primary); font-size: 0.85rem; }
    .headline-list .category { color: var(--text-secondary); font-size: 0.7rem; margin-right: 5px; }
    .headline-list .title { color: var(--text-primary); }

    .fallback-notice { color: var(--text-alert); font-size: 0.75rem; margin-top: 10px; padding: 5px; border: 1px dashed var(--text-alert); }

    .now-playing { color: var(--text-highlight); margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 5px; }

    .setup-notice { border: 1px solid var(--text-alert); padding: 10px; color: var(--text-alert); text-align: center; margin-top: 10px; }
    .setup-link { color: var(--text-primary); font-weight: bold; }
  `]
})
export class NewsWidgetComponent implements OnInit, OnDestroy {
  briefing: any = null;
  loading = true;
  loadingMessage = 'Fetching news...';
  needsConfig = false;
  summaryLines: string[] = [];
  displayArticles: any[] = [];
  hasSummary = false;

  isPlaying = false;
  currentTrackIndex = -1;
  currentAudioSrc = '';

  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  private pollInterval: any;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.fetchNews();
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  fetchNews() {
    this.loading = true;
    this.loadingMessage = 'Fetching news...';
    this.http.get('/api/news').subscribe({
      next: (data: any) => {
        this.briefing = data;
        this.processBriefing();
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

  refreshNews() {
    this.loading = true;
    this.loadingMessage = 'Regenerating briefing...';
    this.http.post('/api/news/refresh', {}).subscribe({
      next: (data: any) => {
        this.briefing = data;
        this.processBriefing();
        this.loading = false;
        this.needsConfig = false;
      },
      error: (err: any) => {
        console.error("News refresh failed", err);
        if (err.status === 503) {
          this.needsConfig = true;
        }
        this.loading = false;
      }
    });
  }

  processBriefing() {
    // Check if we have a valid AI summary
    if (this.briefing?.summaryText &&
      this.briefing.summaryText !== "No summary generated." &&
      this.briefing.summaryText !== "Error generating summary." &&
      this.briefing.summaryText.length > 50) {
      this.hasSummary = true;
      const lines = this.briefing.summaryText.split('\n');
      this.summaryLines = lines
        .filter((l: string) => l.trim() && !l.trim().startsWith('#'))
        .map((l: string) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter((l: string) => l && l.length > 5)
        .slice(0, 7);
    } else {
      // Fallback to raw headlines
      this.hasSummary = false;
      this.needsConfig = !this.briefing?.summaryText || this.briefing.summaryText === "No summary generated.";
      if (this.briefing?.articles) {
        this.displayArticles = this.briefing.articles.slice(0, 10);
      }
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
    this.playTrack(this.currentTrackIndex + 1);
  }
}
