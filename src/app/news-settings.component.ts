import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: 'news' | 'podcast';
  category: string;
  enabled: boolean;
}

@Component({
  selector: 'app-news-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="settings-container">
      <header class="settings-header">
        <a routerLink="/" class="back-link">← Back</a>
        <h1>News Sources</h1>
      </header>

      <div class="sources-list">
        <h2>Active Sources</h2>
        
        <div *ngFor="let group of sourcesByCategory" class="category-group">
          <h3 class="category-title">{{ group.category }}</h3>
          <div class="source-card" *ngFor="let source of group.sources">
            <div class="source-header">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  [(ngModel)]="source.enabled" 
                  (change)="updateSource(source)"
                />
                <span class="slider"></span>
              </label>
              <div class="source-info">
                <h3>{{ source.name }}</h3>
              </div>
              <button class="delete-btn" (click)="deleteSource(source.id)">×</button>
            </div>
            <div class="source-meta">
              <span class="source-url">{{ source.url }}</span>
              <span class="source-type-badge" [class.podcast]="source.type === 'podcast'">
                {{ source.type === 'podcast' ? '🎧' : '📰' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="add-source-section">
        <h2>Add Source</h2>
        
        <div class="suggestions">
          <h3>Categories</h3>
          <div class="category-tabs">
             <button *ngFor="let cat of suggestionCategories" 
               (click)="selectedSuggestionCat = cat"
               [class.active]="selectedSuggestionCat === cat"
               class="cat-tab">
               {{ cat }}
             </button>
          </div>

          <div class="suggestion-list">
            <button 
              *ngFor="let suggestion of suggestionsForSelectedCat" 
              (click)="addSuggestion(suggestion)"
              class="suggestion-btn"
            >
              + {{ suggestion.name }}
            </button>
          </div>
        </div>

        <div class="or-divider"><span>OR CUSTOM</span></div>

        <form (submit)="addSource($event)" class="add-form">
          <div class="form-grid">
            <div class="form-group">
              <input 
                type="text" 
                [(ngModel)]="newSource.name" 
                name="name"
                placeholder="Source Name"
                required
              />
            </div>
            
            <div class="form-group">
              <input 
                type="url" 
                [(ngModel)]="newSource.url" 
                name="url"
                placeholder="RSS/Feed URL"
                required
              />
            </div>

            <div class="form-group short">
              <select [(ngModel)]="newSource.type" name="type">
                <option value="news">News</option>
                <option value="podcast">Podcast</option>
              </select>
            </div>
            
            <button type="submit" class="add-btn">Add</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 15px;
      max-width: 800px;
      margin: 0 auto;
      color: var(--text-primary);
    }
    
    .settings-header {
      margin-bottom: 20px;
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
      border-bottom: 1px solid var(--glass-border);
    }
    
    .back-link {
      color: var(--accent-color);
      text-decoration: none;
      font-size: 0.9rem;
      padding: 5px 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 6px;
    }
    
    h1 { font-size: 1.4rem; margin: 0; }
    h2 { font-size: 1.1rem; margin: 20px 0 10px; color: #fff; opacity: 0.9; }
    
    .category-group { margin-bottom: 15px; }
    
    .category-title {
      font-size: 0.8rem;
      color: var(--accent-color);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 10px 0 8px;
      padding-left: 5px;
      opacity: 0.8;
    }
    
    .source-card {
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      padding: 10px 15px;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .source-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .source-info { flex: 1; overflow: hidden; }
    .source-info h3 { 
      font-size: 1rem; 
      margin: 0; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis; 
    }
    
    .source-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 5px;
      padding-left: 45px; /* Align with text */
    }

    .source-url {
      font-size: 0.7rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80%;
    }
    
    .source-type-badge {
      font-size: 0.7rem;
      opacity: 0.7;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255,255,255,0.1);
      transition: 0.3s;
      border-radius: 20px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 14px; width: 14px;
      left: 3px; bottom: 3px;
      background-color: #fff;
      transition: 0.3s;
      border-radius: 50%;
    }
    
    input:checked + .slider { background: var(--accent-gradient); }
    input:checked + .slider:before { transform: translateX(16px); }
    
    .delete-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 0.4;
      padding: 0 5px;
    }
    .delete-btn:hover { opacity: 1; color: #ff6b6b; }
    
    .add-source-section {
      margin-top: 30px;
      background: var(--glass-bg);
      padding: 15px;
      border-radius: 10px;
      border: 1px solid var(--glass-border);
    }
    
    .form-grid {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    @media (max-width: 600px) {
      .form-grid { flex-wrap: wrap; }
      .form-group { width: 100%; }
      .form-group.short { width: auto; flex: 1; }
      .add-btn { width: auto; }
    }
    
    .form-group { flex: 2; }
    .form-group.short { flex: 1; }

    .form-group input, .form-group select {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: #fff;
      font-size: 0.9rem;
    }
    
    .add-btn {
      padding: 8px 15px;
      background: var(--accent-gradient);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
      font-size: 0.9rem;
      white-space: nowrap;
    }
    
    .suggestions { margin-bottom: 20px; }
    .suggestions h3 { font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 10px; }

    .category-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 10px;
      -webkit-overflow-scrolling: touch;
    }
    .cat-tab {
      white-space: nowrap;
      padding: 4px 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.75rem;
    }
    .cat-tab.active {
      background: var(--accent-color);
      color: #fff;
      border-color: var(--accent-color);
    }
    
    .suggestion-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .suggestion-btn {
      padding: 5px 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 15px;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.8rem;
      transition: background 0.2s;
    }
    .suggestion-btn:hover { background: rgba(255,255,255,0.1); }
    
    .or-divider {
      text-align: center;
      margin: 15px 0;
      position: relative;
    }
    .or-divider span {
      background: #1a1a2e; /* Approximate match to bg */
      padding: 0 10px;
      color: var(--text-secondary);
      font-size: 0.7rem;
      position: relative;
      z-index: 1;
    }
    .or-divider:before {
      content: "";
      position: absolute;
      left: 0; right: 0; top: 50%;
      height: 1px;
      background: var(--glass-border);
    }
  `]
})
export class NewsSettingsComponent implements OnInit {
  sources: NewsSource[] = [];
  newSource = { name: '', url: '', type: 'news' as 'news' | 'podcast', category: 'General' };

  suggestionCategories = ['General', 'Tech', 'AI', 'Science', 'Business', 'Podcasts'];
  selectedSuggestionCat = 'General';

  suggestions = [
    // General
    { name: 'NYTimes', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', type: 'news' as const, category: 'General' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', type: 'news' as const, category: 'General' },
    { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?best-topics=world-news', type: 'news' as const, category: 'General' },

    // Tech
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'news' as const, category: 'Tech' },
    { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', type: 'news' as const, category: 'Tech' },
    { name: 'TechCrunch', url: 'https://feeds.feedburner.com/TechCrunch/', type: 'news' as const, category: 'Tech' },

    // AI
    { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', type: 'news' as const, category: 'AI' },
    { name: 'AI Breakfast', url: 'https://aibreakfast.beehiiv.com/rss', type: 'news' as const, category: 'AI' },

    // Science
    { name: 'NASA News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', type: 'news' as const, category: 'Science' },
    { name: 'Nature', url: 'https://www.nature.com/nature.rss', type: 'news' as const, category: 'Science' },

    // Business
    { name: 'WSJ Business', url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', type: 'news' as const, category: 'Business' },

    // Podcasts
    { name: 'Lex Fridman', url: 'https://lexfridman.com/feed/podcast/', type: 'podcast' as const, category: 'Podcasts' },
    { name: 'Daily Tech News Show', url: 'http://feeds.feedburner.com/DailyTechNewsShow', type: 'podcast' as const, category: 'Podcasts' },
  ];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadSources();
  }

  get sourcesByCategory() {
    const categories = [...new Set(this.sources.map(s => s.category))].sort();
    return categories.map(cat => ({
      category: cat,
      sources: this.sources.filter(s => s.category === cat)
    }));
  }

  get suggestionsForSelectedCat() {
    return this.suggestions.filter(s => s.category === this.selectedSuggestionCat);
  }

  loadSources() {
    this.http.get<NewsSource[]>('/api/news/sources').subscribe({
      next: (data) => this.sources = data,
      error: (err) => console.error('Failed to load sources', err)
    });
  }

  updateSource(source: NewsSource) {
    this.http.put(`/api/news/sources/${source.id}`, source).subscribe({
      error: (err) => console.error('Failed to update source', err)
    });
  }

  deleteSource(id: string) {
    if (!confirm('Delete this source?')) return;

    this.http.delete(`/api/news/sources/${id}`).subscribe({
      next: () => this.sources = this.sources.filter(s => s.id !== id),
      error: (err) => console.error('Failed to delete source', err)
    });
  }

  addSource(event?: Event) {
    if (event) event.preventDefault();

    const source: NewsSource = {
      id: Date.now().toString(),
      name: this.newSource.name,
      url: this.newSource.url,
      type: this.newSource.type,
      category: this.newSource.category || 'General',
      enabled: true
    };

    this.http.post<NewsSource>('/api/news/sources', source).subscribe({
      next: (created) => {
        this.sources.push(created);
        this.newSource = { name: '', url: '', type: 'news', category: 'General' };
      },
      error: (err) => console.error('Failed to add source', err)
    });
  }

  addSuggestion(suggestion: any) {
    // Directly add the suggestion call
    const source: NewsSource = {
      id: Date.now().toString(),
      name: suggestion.name,
      url: suggestion.url,
      type: suggestion.type,
      category: suggestion.category,
      enabled: true
    };

    this.http.post<NewsSource>('/api/news/sources', source).subscribe({
      next: (created) => {
        this.sources.push(created);
        // Optional: show a toast/notification
      },
      error: (err) => console.error('Failed to add suggestion', err)
    });
  }
}
