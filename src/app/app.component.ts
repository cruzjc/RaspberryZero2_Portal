import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NewsWidgetComponent } from './news-widget.component';

interface Resource {
    id: string;
    content: string;
    createdAt: string;
}

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, HttpClientModule, DatePipe, NewsWidgetComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
})

export class AppComponent implements OnInit {
    title = 'RaspberryZero2_Portal';
    currentDate = new Date();

    sessionActive = false;
    sessionId = '';
    transcript: string[] = [];
    private pc?: RTCPeerConnection;
    private ephemeralKey = '';

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

    async startCall(): Promise<void> {
        if (!this.isBrowser) return;

        try {
            const tokenResponse = await firstValueFrom(
                this.http.get<any>('/session'),
            );
            this.ephemeralKey = tokenResponse.client_secret.value;
            this.sessionId = tokenResponse.id;
        } catch (err) {
            console.error('Error starting call', err);
            return;
        }

        this.transcript = [];
        this.sessionActive = true;

        try {
            // Create a peer connection
            this.pc = new RTCPeerConnection();

            // Set up to play remote audio from the model
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            this.pc.ontrack = (e) => (audioEl.srcObject = e.streams[0]);

            // Add local audio track for microphone input in the browser
            const ms = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            this.pc.addTrack(ms.getTracks()[0]);

            // Set up data channel for sending and receiving events
            const dc = this.pc.createDataChannel('oai-events');
            dc.addEventListener('message', (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.delta) {
                        this.transcript = [...this.transcript, msg.delta];
                    } else if (msg.text) {
                        this.transcript = [...this.transcript, msg.text];
                    }
                } catch {
                    this.transcript = [...this.transcript, e.data];
                }
            });

            // Start the session using the Session Description Protocol (SDP)
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);

            const baseUrl = 'https://api.openai.com/v1/realtime';
            const model = 'gpt-4o-mini-realtime-preview-2024-12-17';
            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${this.ephemeralKey}`,
                    'Content-Type': 'application/sdp',
                },
            });

            const answer = new RTCSessionDescription({
                type: 'answer',
                sdp: await sdpResponse.text(),
            });
            await this.pc.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error initializing WebRTC:', error);
            this.sessionActive = false;
        }
    }

    endCall(): void {
        this.pc?.close();
        this.pc = undefined;
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
}
