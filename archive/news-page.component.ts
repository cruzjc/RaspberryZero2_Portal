
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-news-page',
    standalone: true,
    imports: [CommonModule, RouterModule, HttpClientModule],
    template: `
    <div class="news-page-container">
      <header class="news-header">
        <a routerLink="/" class="back-link">
             <span class="arrow">←</span> Back to Dashboard
        </a>
        <h1>Daily Briefing <span class="date">{{ briefing?.date | date:'fullDate' }}</span></h1>
      </header>
      
      <div *ngIf="loading" class="loading">Loading detailed briefing...</div>

      <div *ngIf="briefing" class="content-wrapper">
        <div class="generated-summary">
            <h2>AI Summary</h2>
            <div class="summary-text">
                <p *ngFor="let p of paragraphs">{{ p }}</p>
            </div>
            <div *ngIf="briefing.audioPlaylist?.length" class="audio-section">
                <h3>Audio Playlist</h3>
                 <ul class="playlist">
                    <li *ngFor="let track of briefing.audioPlaylist">
                        <span class="track-icon">{{ track.type === 'summary' ? '🎙️' : '🎧' }}</span>
                        {{ track.title }}
                        <a [href]="track.url" target="_blank" class="download-link">Download</a>
                    </li>
                 </ul>
            </div>
        </div>
        
        <div class="articles-list">
            <h2>Sources & Full Coverage</h2>
            
            <div class="article-card" *ngFor="let article of briefing.articles">
                <div class="article-source">
                    {{ article.sourceName }} 
                    <span class="time">• {{ article.pubDate | date:'shortTime' }}</span>
                </div>
                <h3><a [href]="article.link" target="_blank">{{ article.title }}</a></h3>
                <p class="snippet">{{ article.snippet }}</p>
                
                <div *ngIf="article.enclosure" class="podcast-badge">
                   🎧 Podcast Episode
                   <a [href]="article.enclosure.url" target="_blank">Listen</a>
                </div>
            </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .news-page-container {
        padding: 40px;
        max-width: 1000px;
        margin: 0 auto;
        color: #e0e0e0;
        font-family: 'Inter', sans-serif;
    }
    .news-header {
        margin-bottom: 40px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 20px;
    }
    .back-link {
        color: #4facfe;
        text-decoration: none;
        font-size: 1rem;
        display: inline-flex;
        align-items: center;
        margin-bottom: 15px;
        transition: color 0.2s;
    }
    .back-link:hover { color: #00f2fe; }
    .arrow { margin-right: 5px; font-size: 1.2rem; }
    
    h1 { font-size: 2.5rem; margin: 0; background: linear-gradient(90deg, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .date { font-size: 1rem; color: #888; font-weight: normal; margin-left: 15px; -webkit-text-fill-color: #888; }
    
    .content-wrapper { display: flex; gap: 40px; flex-wrap: wrap; }
    .generated-summary { flex: 1; min-width: 300px; }
    .articles-list { flex: 1.5; min-width: 300px; }
    
    .summary-text p { font-size: 1.05rem; line-height: 1.6; margin-bottom: 15px; color: #ccc; }
    .audio-section { margin-top: 30px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; }
    .playlist { list-style: none; padding: 0; margin: 10px 0 0 0; }
    .playlist li { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .track-icon { margin-right: 10px; }
    .download-link { margin-left: auto; color: #666; font-size: 0.8rem; text-decoration: none; }
    
    .article-card { 
        background: rgba(255,255,255,0.03); 
        padding: 20px; 
        margin-bottom: 20px; 
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.05);
        transition: transform 0.2s, background 0.2s;
    }
    .article-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.06); }
    
    .article-source { font-size: 0.8rem; color: #4facfe; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: bold; }
    .time { color: #666; text-transform: none; margin-left: 5px; font-weight: normal; }
    
    h3 { margin: 0 0 10px 0; font-size: 1.2rem; }
    h3 a { color: #fff; text-decoration: none; }
    
    .snippet { font-size: 0.95rem; color: #bbb; line-height: 1.5; margin-bottom: 0; }
    
    .podcast-badge { 
        margin-top: 15px; background: rgba(79, 172, 254, 0.1); 
        color: #4facfe; padding: 5px 10px; border-radius: 20px; 
        font-size: 0.8rem; display: inline-flex; align-items: center; gap: 10px;
    }
  `]
})
export class NewsPageComponent implements OnInit {
    briefing: any = null;
    loading = true;
    paragraphs: string[] = [];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.http.get('/api/news').subscribe({
            next: (data: any) => {
                this.briefing = data;
                if (data.summaryText) {
                    // Split bullets or paragraphs
                    this.paragraphs = data.summaryText.split('\n').filter((l: string) => l.trim().length > 0);
                }
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }
}
