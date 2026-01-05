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
    .settings-container { padding: 10px; color: var(--text-primary); }
    .settings-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-bottom: 1px dashed var(--text-secondary); padding-bottom: 10px; }
    .back-link { color: var(--text-secondary); text-decoration: none; border: 1px solid var(--text-secondary); padding: 2px 8px; font-size: 0.9rem; }
    .back-link:hover { background: var(--text-secondary); color: black; }
    h1 { font-size: 1.2rem; margin: 0; color: var(--text-primary); text-transform: uppercase; }

    .sources-list { margin-bottom: 20px; }
    .category-group { margin-bottom: 15px; border-left: 1px solid var(--text-secondary); padding-left: 10px; }
    .category-title { color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; margin: 5px 0; }
    
    .source-card { border: 1px solid var(--border-color); padding: 5px; margin-bottom: 5px; }
    .source-header { display: flex; align-items: center; gap: 10px; }
    .source-info h3 { font-size: 1rem; margin: 0; color: var(--text-primary); }
    .delete-btn { background: none; border: 1px solid var(--text-alert); color: var(--text-alert); cursor: pointer; padding: 0 5px; margin-left: auto; }
    .delete-btn:hover { background: var(--text-alert); color: black; }

    .source-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); padding-left: 45px; }
    .source-type-badge.podcast { color: var(--text-highlight); }

    /* Retro Toggle */
    .toggle-switch { position: relative; display: inline-block; width: 30px; height: 16px; border: 1px solid var(--text-secondary); }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: black; transition: .2s; }
    .slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 2px; bottom: 2px; background-color: var(--text-secondary); transition: .2s; }
    input:checked + .slider { background-color: var(--text-secondary); }
    input:checked + .slider:before { transform: translateX(14px); background-color: black; }

    .add-source-section { border: 1px dashed var(--text-secondary); padding: 10px; margin-top: 20px; }
    .category-tabs { display: flex; gap: 5px; margin-bottom: 10px; overflow-x: auto; }
    .cat-tab { background: black; border: 1px solid var(--text-secondary); color: var(--text-secondary); cursor: pointer; padding: 2px 8px; font-size: 0.8rem; }
    .cat-tab.active, .cat-tab:hover { background: var(--text-secondary); color: black; }

    .suggestion-list { display: flex; flex-wrap: wrap; gap: 5px; }
    .suggestion-btn { background: black; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; font-size: 0.8rem; padding: 2px 6px; }
    .suggestion-btn:hover { border-color: var(--text-primary); }

    .or-divider { text-align: center; margin: 10px 0; border-bottom: 1px solid var(--border-color); line-height: 0.1em; color: var(--text-secondary); }
    .or-divider span { background: black; padding: 0 10px; }

    .form-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .form-group input, .form-group select { background: black; border: 1px solid var(--text-secondary); color: var(--text-primary); padding: 5px; font-family: var(--font-mono); }
    .add-btn { background: black; border: 1px solid var(--text-primary); color: var(--text-primary); cursor: pointer; padding: 5px 15px; font-weight: bold; }
    .add-btn:hover { background: var(--text-primary); color: black; }
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
