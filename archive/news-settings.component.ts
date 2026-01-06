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
    enabled: boolean;
}

@Component({
    selector: 'app-news-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="settings-container">
      <header class="settings-header">
        <a routerLink="/" class="back-link">← Back to Dashboard</a>
        <h1>News Source Settings</h1>
      </header>

      <div class="sources-list">
        <h2>Active Sources</h2>
        
        <div class="source-card" *ngFor="let source of sources">
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
              <span class="source-type-badge" [class.podcast]="source.type === 'podcast'">
                {{ source.type === 'podcast' ? '🎧 Podcast' : '📰 News' }}
              </span>
            </div>
            <button class="delete-btn" (click)="deleteSource(source.id)">🗑️</button>
          </div>
          <div class="source-url">{{ source.url }}</div>
        </div>
      </div>

      <div class="add-source-section">
        <h2>Add New Source</h2>
        <form (submit)="addSource($event)" class="add-form">
          <div class="form-group">
            <label>Source Name</label>
            <input 
              type="text" 
              [(ngModel)]="newSource.name" 
              name="name"
              placeholder="e.g., TechCrunch"
              required
            />
          </div>
          
          <div class="form-group">
            <label>RSS/Podcast URL</label>
            <input 
              type="url" 
              [(ngModel)]="newSource.url" 
              name="url"
              placeholder="https://..."
              required
            />
          </div>
          
          <div class="form-group">
            <label>Type</label>
            <select [(ngModel)]="newSource.type" name="type">
              <option value="news">News Article</option>
              <option value="podcast">Podcast</option>
            </select>
          </div>

          <button type="submit" class="add-btn">Add Source</button>
        </form>

        <div class="suggestions">
          <h3>Popular Sources</h3>
          <button 
            *ngFor="let suggestion of suggestions" 
            (click)="addSuggestion(suggestion)"
            class="suggestion-btn"
          >
            + {{ suggestion.name }}
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .settings-container {
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      color: #e0e0e0;
    }
    
    .settings-header {
      margin-bottom: 40px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 20px;
    }
    
    .back-link {
      color: #4facfe;
      text-decoration: none;
      font-size: 1rem;
      display: inline-block;
      margin-bottom: 15px;
    }
    
    h1 { font-size: 2rem; margin: 0; }
    h2 { font-size: 1.3rem; margin-bottom: 20px; color: #fff; }
    h3 { font-size: 1.1rem; margin: 0; }
    
    .sources-list { margin-bottom: 50px; }
    
    .source-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 15px;
      transition: all 0.2s;
    }
    
    .source-card:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-2px);
    }
    
    .source-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
    }
    
    .source-info { flex: 1; }
    
    .source-url {
      font-size: 0.85rem;
      color: #888;
      margin-left: 60px;
      word-break: break-all;
    }
    
    .source-type-badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 3px 8px;
      background: rgba(79, 172, 254, 0.2);
      color: #4facfe;
      border-radius: 12px;
      margin-left: 10px;
    }
    
    .source-type-badge.podcast {
      background: rgba(138, 43, 226, 0.2);
      color: #a78bfa;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #444;
      transition: 0.3s;
      border-radius: 28px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #4facfe;
    }
    
    input:checked + .slider:before {
      transform: translateX(22px);
    }
    
    .delete-btn {
      background: none;
      border: 1px solid rgba(255, 100, 100, 0.3);
      color: #ff6b6b;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }
    
    .delete-btn:hover {
      background: rgba(255, 100, 100, 0.1);
      border-color: #ff6b6b;
    }
    
    .add-source-section {
      background: rgba(255,255,255,0.03);
      padding: 30px;
      border-radius: 12px;
    }
    
    .add-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-group label {
      font-size: 0.9rem;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .form-group input,
    .form-group select {
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #4facfe;
      background: rgba(255,255,255,0.08);
    }
    
    .add-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .add-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(79, 172, 254, 0.3);
    }
    
    .suggestions {
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .suggestion-btn {
      padding: 8px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      color: #aaa;
      margin: 5px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .suggestion-btn:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
      border-color: #4facfe;
    }
  `]
})
export class NewsSettingsComponent implements OnInit {
    sources: NewsSource[] = [];
    newSource = { name: '', url: '', type: 'news' as 'news' | 'podcast' };

    suggestions = [
        { name: 'NYTimes', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', type: 'news' as const },
        { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'news' as const },
        { name: 'Lex Fridman Podcast', url: 'https://lexfridman.com/feed/podcast/', type: 'podcast' as const },
        { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', type: 'news' as const },
    ];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadSources();
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

    addSource(event: Event) {
        event.preventDefault();

        const source: NewsSource = {
            id: Date.now().toString(),
            name: this.newSource.name,
            url: this.newSource.url,
            type: this.newSource.type,
            enabled: true
        };

        this.http.post<NewsSource>('/api/news/sources', source).subscribe({
            next: (created) => {
                this.sources.push(created);
                this.newSource = { name: '', url: '', type: 'news' };
            },
            error: (err) => console.error('Failed to add source', err)
        });
    }

    addSuggestion(suggestion: typeof this.suggestions[0]) {
        this.newSource = { ...suggestion };
    }
}
