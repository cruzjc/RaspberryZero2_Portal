
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-news-widget',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <section class="widget news">
      <h2>
        AI News Summary
        <button class="icon-btn" (click)="toggleAudio()" [disabled]="!briefing?.audioPlaylist?.length">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
      </h2>
      
      <div *ngIf="loading" class="loading">
        <span class="spinner">↻</span> Generating briefing...
      </div>
      
      <div *ngIf="briefing">
        <ul class="summary-list">
          <li *ngFor="let line of summaryLines">{{ line }}</li>
        </ul>
        <div class="actions">
            <a routerLink="/news" class="read-more">Read Full Briefing</a>
        </div>
      </div>
       
      <div *ngIf="!loading && !briefing" class="error-msg">
        Could not load news.
      </div>

      <audio #audioPlayer [src]="currentAudioSrc" (ended)="onAudioEnded()" (error)="onAudioError($event)"></audio>
      
      <div *ngIf="currentTrackIndex >= 0" class="now-playing">
        Now Playing: {{ briefing?.audioPlaylist?.[currentTrackIndex]?.title }}
      </div>
    </section>
  `,
    styles: [`
    .widget.news { 
        position: relative;
    }
    .icon-btn { 
        background: none; border: 1px solid rgba(255,255,255,0.3); 
        color: white; border-radius: 50%; width: 30px; height: 30px; 
        cursor: pointer; margin-left: 10px; display: inline-flex; 
        align-items: center; justify-content: center; font-size: 0.9rem; 
        transition: background 0.2s;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.1); }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .loading { font-size: 0.9rem; color: #aaa; padding: 10px 0; }
    .spinner { display: inline-block; animation: spin 1s linear infinite; margin-right: 5px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .summary-list { 
        list-style-type: none; padding: 0; margin: 10px 0; font-size: 0.9rem; line-height: 1.4;
    }
    .summary-list li { 
        margin-bottom: 6px; padding-left: 15px; position: relative; 
    }
    .summary-list li::before {
        content: "•"; position: absolute; left: 0; color: #4facfe;
    }
    
    .read-more { 
        display: inline-block; margin-top: 5px; color: #4facfe; 
        text-decoration: none; font-size: 0.85rem; font-weight: bold; 
    }
    .read-more:hover { text-decoration: underline; }
    
    .now-playing { 
        font-size: 0.75rem; color: #88c0d0; margin-top: 10px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
        border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;
    }
  `]
})
export class NewsWidgetComponent implements OnInit, OnDestroy {
    briefing: any = null;
    loading = true;
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
            },
            error: (err) => {
                console.error("News fetch failed", err);
                this.loading = false;
            }
        });
    }

    processSummary() {
        if (this.briefing?.summaryText) {
            this.summaryLines = this.briefing.summaryText
                .split('\n')
                .map((l: string) => l.trim().replace(/^[-*•]\s*/, ''))
                .filter((l: string) => l && l.length > 5)
                .slice(0, 5); // Limit to top 5 for widget
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
