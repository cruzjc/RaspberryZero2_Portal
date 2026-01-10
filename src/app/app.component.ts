import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NewsWidgetComponent } from './news-widget.component';
import { AdminSettingsComponent } from './admin-settings.component';
import { ServicesManagementComponent } from './services-management.component';
import { TradingStatusComponent } from './trading-status.component';
import { ChatAssistantComponent } from './chat-assistant.component';
import { VoiceChatComponent } from './voice-chat.component';

interface Resource {
    id: string;
    content: string;
    createdAt: string;
}

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, HttpClientModule, DatePipe, NewsWidgetComponent, AdminSettingsComponent, ServicesManagementComponent, TradingStatusComponent, ChatAssistantComponent, VoiceChatComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
})

export class AppComponent implements OnInit {
    currentView: 'dashboard' | 'settings' | 'services' = 'dashboard';
    title = 'RaspberryZero2_Portal';
    currentDate = new Date();

    sessionActive = false;
    chatOpen = false;
    voiceActive = false;

    resources: Resource[] = [];

    private isBrowser: boolean;

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: Object,
        public router: Router
    ) {
        this.isBrowser = isPlatformBrowser(platformId);

        if (this.isBrowser) {
            setInterval(() => (this.currentDate = new Date()), 1000);
        }
    }

    ngOnInit(): void {
        if (this.isBrowser) {
            this.loadResources();
        }
    }

    get isDashboard() {
        return this.router.url === '/';
    }

    private async loadResources(): Promise<void> {
        try {
            this.resources = await firstValueFrom(
                this.http.get<Resource[]>('/api/resources'),
            );
        } catch (err) {
            console.error('Error loading resources', err);
        }
    }

    async addResource(): Promise<void> {
        if (!this.isBrowser) return;
        const content = prompt('Enter text or URL');
        if (!content) return;
        try {
            const res = await firstValueFrom(
                this.http.post<Resource>('/api/resources', { content }),
            );
            this.resources = [res, ...this.resources];
        } catch (err) {
            console.error('Error adding resource', err);
        }
    }

    async deleteResource(r: Resource): Promise<void> {
        if (!this.isBrowser) return;
        if (!confirm('Delete this entry?')) return;
        try {
            await firstValueFrom(this.http.delete(`/api/resources/${r.id}`));
            this.resources = this.resources.filter((x) => x.id !== r.id);
        } catch (err) {
            console.error('Error deleting resource', err);
        }
    }

    startCall(): void {
        if (!this.isBrowser) return;
        this.chatOpen = true;
        this.sessionActive = true;
    }

    endCall(): void {
        this.chatOpen = false;
        this.sessionActive = false;
    }

    startVoice(): void {
        if (!this.isBrowser) return;
        this.voiceActive = true;
        this.sessionActive = true;
    }

    endVoice(): void {
        this.voiceActive = false;
        this.sessionActive = false;
    }

    async updatePortal(): Promise<void> {
        if (!this.isBrowser) return;
        try {
            await firstValueFrom(this.http.post('/api/update-repo', {}));
        } catch (err) {
            console.error('Error updating portal', err);
        }
    }

    async deployPortal(): Promise<void> {
        if (!this.isBrowser) return;
        try {
            await firstValueFrom(this.http.post('/api/deploy', {}));
        } catch (err) {
            console.error('Error deploying portal', err);
        }
    }

    toggleSettings() {
        this.currentView = 'settings';
    }
}
