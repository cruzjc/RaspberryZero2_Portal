
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
      <header class="settings-header">
        <a routerLink="/" class="back-link">← Back to Dashboard</a>
        <h1>Daily Briefing <span class="date">{{ briefing?.date | date:'fullDate' }}</span></h1>
      </header>
      
      <div *ngIf="loading" class="loading">
        <span class="spinner">↻</span> Loading detailed briefing...
      </div>

      <div *ngIf="briefing" class="content-wrapper">
        <div class="generated-summary">
            <h2 class="section-title">AI Summary</h2>
            <div class="glass-panel summary-card">
              <div class="summary-text">
                  <!-- Render markdown-like bullets better -->
                  <div *ngFor="let p of paragraphs" [class.summary-header]="p.startsWith('#')" [class.summary-bullet]="p.startsWith('-') || p.startsWith('•')">
                    {{ formatParagraph(p) }}
                  </div>
              </div>
            </div>

            <div *ngIf="briefing.audioPlaylist?.length" class="audio-section glass-panel">
                <h3 class="section-title">Audio Playlist</h3>
                 <ul class="playlist">
                    <li *ngFor="let track of briefing.audioPlaylist" class="track-item">
                        <span class="track-icon">{{ track.type === 'summary' ? '🎙️' : '🎧' }}</span>
                        <div class="track-info">
                          <span class="track-title">{{ track.title }}</span>
                          <span class="track-type">{{ track.type }}</span>
                        </div>
                        <a [href]="track.url" target="_blank" class="download-link">Download</a>
                    </li>
                 </ul>
            </div>
        </div>
        
        <div class="articles-list">
            <h2 class="section-title">Sources & Full Coverage</h2>
            
            <div *ngFor="let group of articlesByCategory">
              <h3 class="category-divider">{{ group.category }}</h3>
              <div class="article-card glass-panel" *ngFor="let article of group.articles">
                  <div class="article-source">
                      <span class="source-name">{{ article.sourceName }}</span>
                      <span class="time">• {{ article.pubDate | date:'shortTime' }}</span>
                  </div>
                  <h3><a [href]="article.link" target="_blank">{{ article.title }}</a></h3>
                  <p class="snippet">{{ article.snippet }}</p>
                  
                  <div *ngIf="article.enclosure" class="podcast-badge">
                     🎧 Podcast Episode
                     <a [href]="article.enclosure?.url" target="_blank">Listen</a>
                  </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .news-page-container {
        padding: 20px;
        max-width: 1100px;
        margin: 0 auto;
        color: var(--text-primary);
    }
    
    .settings-header {
      margin-bottom: 30px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 10px;
    }
    
    .date { font-size: 0.9rem; color: var(--text-secondary); font-weight: normal; margin-left: 10px; }
    
    .loading { text-align: center; padding: 40px; color: var(--text-secondary); }
    .spinner { display: inline-block; animation: spin 1s linear infinite; margin-right: 10px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .content-wrapper { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
    
    @media (max-width: 900px) {
      .content-wrapper { grid-template-columns: 1fr; }
    }
    
    .section-title {
      font-size: 1.2rem;
      margin: 0 0 15px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .summary-card { padding: 25px; margin-bottom: 30px; }
    
    .summary-text { line-height: 1.6; }
    .summary-header {
      font-weight: bold;
      color: var(--accent-color);
      margin: 20px 0 10px;
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-header:first-child { margin-top: 0; }
    .summary-bullet {
      margin-bottom: 12px;
      padding-left: 20px;
      position: relative;
    }
    .summary-bullet::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--accent-color);
    }
    
    .audio-section { padding: 20px; }
    .playlist { list-style: none; padding: 0; margin: 0; }
    .track-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--glass-border);
    }
    .track-item:last-child { border-bottom: none; }
    .track-icon { font-size: 1.2rem; margin-right: 15px; }
    .track-info { display: flex; flex-direction: column; flex: 1; }
    .track-title { font-weight: 500; font-size: 0.95rem; }
    .track-type { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; }
    
    .download-link { font-size: 0.8rem; color: var(--accent-color); text-decoration: none; }
    
    .category-divider {
      font-size: 0.9rem;
      color: var(--accent-color);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 30px 0 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(79, 172, 254, 0.2);
    }
    
    .article-card { 
      padding: 20px; 
      margin-bottom: 20px;
    }
    
    .article-source { 
      font-size: 0.75rem; 
      margin-bottom: 8px; 
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .source-name { color: var(--accent-color); font-weight: bold; text-transform: uppercase; }
    .time { color: var(--text-secondary); }
    
    .article-card h3 { margin: 0 0 10px 0; font-size: 1.1rem; }
    .article-card h3 a { color: #fff; text-decoration: none; transition: color 0.2s; }
    .article-card h3 a:hover { color: var(--accent-color); }
    
    .snippet { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }
    
    .podcast-badge { 
        margin-top: 15px; 
        background: rgba(167, 139, 250, 0.1); 
        color: #a78bfa; 
        padding: 6px 12px; 
        border-radius: 15px; 
        font-size: 0.75rem; 
        display: inline-flex; 
        align-items: center; 
        gap: 10px;
        border: 1px solid rgba(167, 139, 250, 0.2);
    }
    .podcast-badge a { color: #a78bfa; font-weight: bold; }
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

  formatParagraph(p: string): string {
    return p.replace(/^#+\s*/, '').replace(/^[-*•]\s*/, '');
  }

  get articlesByCategory() {
    if (!this.briefing?.articles) return [];
    const cats = [...new Set(this.briefing.articles.map((a: any) => a.category || 'General'))].sort();
    return cats.map(cat => ({
      category: cat,
      articles: this.briefing.articles.filter((a: any) => (a.category || 'General') === cat)
    }));
  }
}
