import { Component, EventEmitter, Output, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface VoiceSession {
  wsUrl: string;
  sessionId: string;
  persona: string;
}

@Component({
  selector: 'app-voice-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-overlay">
      <div class="voice-modal">
        <header class="voice-header">
          <div class="persona-info">
            <span class="persona-icon">🎙️</span>
            <span class="persona-name">{{ personaName }}</span>
            <span class="connection-status" [class.connected]="connected" [class.listening]="listening">
              {{ statusText }}
            </span>
          </div>
          <button class="close-btn" (click)="endSession()">[ X ]</button>
        </header>

        <div class="voice-visualizer">
          <div class="waveform">
            <div class="wave-bar" *ngFor="let bar of waveformBars" [style.height.%]="bar"></div>
          </div>
          <div class="status-icon" [class.active]="listening">
            {{ listening ? '🎤' : '🔇' }}
          </div>
        </div>

        <div class="transcript-area">
          <div class="transcript-line" *ngFor="let line of transcript">
            <span class="speaker" [class.user]="line.speaker === 'user'">
              {{ line.speaker === 'user' ? '> YOU:' : '< ' + personaName.toUpperCase() + ':' }}
            </span>
            <span class="text">{{ line.text }}</span>
          </div>
          <div class="transcript-line thinking" *ngIf="aiThinking">
            <span class="speaker">< {{ personaName.toUpperCase() }}:</span>
            <span class="text">...</span>
          </div>
        </div>

        <div class="voice-controls">
          <button class="mic-btn" [class.active]="listening" (click)="toggleMic()">
            {{ listening ? '[ MUTE ]' : '[ UNMUTE ]' }}
          </button>
          <button class="end-btn" (click)="endSession()">[ END SESSION ]</button>
        </div>

        <div class="error-msg" *ngIf="error">⚠ {{ error }}</div>
      </div>
    </div>
  `,
  styles: [`
    .voice-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .voice-modal {
      width: 90%;
      max-width: 500px;
      background: #0a0a0a;
      border: 2px solid #ff6b6b;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 40px rgba(255, 107, 107, 0.3);
    }

    .voice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid #333;
      background: #111;
    }

    .persona-info { display: flex; align-items: center; gap: 10px; }
    .persona-icon { font-size: 1.2rem; }
    .persona-name { color: #ff6b6b; font-weight: bold; text-transform: uppercase; }
    .connection-status {
      font-size: 0.75rem;
      color: #666;
      padding: 2px 8px;
      border: 1px solid currentColor;
    }
    .connection-status.connected { color: #00ff88; }
    .connection-status.listening { color: #ff6b6b; animation: pulse 1s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .close-btn {
      background: transparent;
      border: 1px solid #ff6b6b;
      color: #ff6b6b;
      padding: 5px 10px;
      cursor: pointer;
      font-family: inherit;
    }
    .close-btn:hover { background: #ff6b6b; color: black; }

    .voice-visualizer {
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

    .waveform {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 60px;
    }

    .wave-bar {
      width: 4px;
      background: linear-gradient(to top, #ff6b6b, #00ff88);
      border-radius: 2px;
      transition: height 0.1s ease;
    }

    .status-icon {
      font-size: 3rem;
      opacity: 0.5;
    }
    .status-icon.active {
      opacity: 1;
      animation: glow 1s infinite alternate;
    }
    @keyframes glow {
      from { text-shadow: 0 0 10px #ff6b6b; }
      to { text-shadow: 0 0 30px #ff6b6b; }
    }

    .transcript-area {
      flex: 1;
      min-height: 100px;
      max-height: 150px;
      overflow-y: auto;
      padding: 15px;
      border-top: 1px solid #333;
      border-bottom: 1px solid #333;
      font-family: var(--font-mono, monospace);
      font-size: 0.85rem;
    }

    .transcript-line { margin-bottom: 8px; }
    .speaker { color: #666; margin-right: 8px; }
    .speaker.user { color: #00ffff; }
    .text { color: #ddd; }
    .thinking .text { animation: blink 0.5s infinite; }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .voice-controls {
      display: flex;
      gap: 10px;
      padding: 15px;
      justify-content: center;
    }

    .mic-btn, .end-btn {
      background: black;
      border: 1px solid #666;
      color: #ddd;
      padding: 10px 20px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
    .mic-btn.active { border-color: #ff6b6b; color: #ff6b6b; }
    .mic-btn:hover { background: #333; }
    .end-btn { border-color: #ff6b6b; color: #ff6b6b; }
    .end-btn:hover { background: #ff6b6b; color: black; }

    .error-msg {
      background: rgba(255, 100, 100, 0.2);
      color: #ff6b6b;
      padding: 10px 15px;
      font-size: 0.85rem;
    }
  `]
})
export class VoiceChatComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  personaName = 'ARIA';
  connected = false;
  listening = false;
  aiThinking = false;
  error = '';
  transcript: { speaker: 'user' | 'ai'; text: string }[] = [];
  waveformBars: number[] = new Array(20).fill(5);

  private mediaStream?: MediaStream;
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private animationFrame?: number;
  private ws?: WebSocket;

  constructor(private http: HttpClient) { }

  get statusText(): string {
    if (this.error) return '◉ ERROR';
    if (this.listening) return '◉ LISTENING';
    if (this.connected) return '◉ CONNECTED';
    return '◉ CONNECTING...';
  }

  ngOnInit() {
    this.initSession();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async initSession() {
    try {
      // Get voice session from backend
      const session = await this.http.get<VoiceSession>('/api/voice/session').toPromise();

      if (!session) {
        this.error = 'Failed to initialize voice session';
        return;
      }

      this.personaName = session.persona || 'ARIA';

      // Check if mediaDevices is supported (requires Secure Context: HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access requires a Secure Context (HTTPS or localhost). If testing on LAN, enable "Insecure origins treated as secure" in chrome://flags.');
      }

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for visualization
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      this.startVisualization();
      this.connected = true;
      this.listening = true;

      // For now, simulate AI responses (full WebSocket integration would go here)
      this.simulateWelcome();

    } catch (err: any) {
      console.error('Voice init error:', err);
      if (err.name === 'NotAllowedError') {
        this.error = 'Microphone access denied. Please enable microphone permissions.';
      } else if (err.status === 503) {
        this.error = err.error?.error || 'Inworld API not configured. Add keys in Settings.';
      } else {
        this.error = err.message || 'Failed to initialize voice session';
      }
    }
  }

  private simulateWelcome() {
    // Simulate AI greeting since full Inworld WebSocket requires character setup
    setTimeout(() => {
      this.aiThinking = true;
      setTimeout(() => {
        this.aiThinking = false;
        this.transcript.push({
          speaker: 'ai',
          text: 'Voice link established. I can hear you. How may I assist you today?'
        });
      }, 1500);
    }, 1000);
  }

  private startVisualization() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateBars = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Map frequency data to waveform bars
      this.waveformBars = this.waveformBars.map((_, i) => {
        const idx = Math.floor(i * dataArray.length / this.waveformBars.length);
        return Math.max(5, (dataArray[idx] / 255) * 100);
      });

      this.animationFrame = requestAnimationFrame(updateBars);
    };

    updateBars();
  }

  toggleMic() {
    if (this.mediaStream) {
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.listening = audioTrack.enabled;
      }
    }
  }

  endSession() {
    this.cleanup();
    this.close.emit();
  }

  private cleanup() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
