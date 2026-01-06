# AI News Summary Implementation Plan

## Objective
Add a daily AI-generated news summary feature to the Raspberry Pi 2 portal.

## Features
1.  **News Retrieval**: Fetch news/podcasts from user-selected sources.
2.  **AI Summarization**: Use OpenAI to summarize content into bullet points.
3.  **Audio Generation**: Use ElevenLabs to narrate summaries.
4.  **UI Integration**:
    *   **Tile**: Bullet list + Audio Player button.
    *   **Detail View**: Long-form content with citations.
    *   **Audio Player**: Playlist support (AI narration + Podcast episodes).

## Tech Stack
*   **Backend**: Node.js/Express (in `server.ts`)
*   **Frontend**: Angular
*   **AI**: OpenAI (Summaries), ElevenLabs (Voice)

## Steps

### Phase 1: Backend Setup
- [ ] Install dependencies: `rss-parser`, `elevenlabs` (or use fetch).
- [ ] Create `NewsService` logic in `server.ts` (or separate file).
    - [ ] `fetchNews()`: Parse RSS feeds.
    - [ ] `summarizeNews()`: OpenAI integration.
    - [ ] `generateAudio()`: ElevenLabs integration.
    - [ ] `getDailyBriefing()`: Main orchestrator (checks cache/date).
- [ ] Add API Endpoints:
    - [ ] `GET /api/news/latest`
    - [ ] `POST /api/news/settings` (sources, voice)

### Phase 2: Frontend Components
- [ ] Create `NewsWidgetComponent`.
    - [ ] specific styling for tile.
    - [ ] Play button logic.
- [ ] Create `NewsDetailComponent` (Page).
    - [ ] Route: `/news-detail`
    - [ ] Content display.
- [ ] Update `AppComponent`:
    - [ ] Replace placeholder with `NewsWidgetComponent`.
    - [ ] Add Audio Player (global or widget-based).

### Phase 3: Integration & Polish
- [ ] Connect Frontend to Backend API.
- [ ] Test Audio Playlist logic.
- [ ] Verify Styles/Responsiveness.
