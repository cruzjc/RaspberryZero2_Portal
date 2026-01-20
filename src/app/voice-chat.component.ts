import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Web Speech API types
declare var webkitSpeechRecognition: any;

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
          <div class="status-icon" [class.active]="listening" [class.speaking]="isSpeaking">
            {{ isSpeaking ? '🔊' : (listening ? '🎤' : '🔇') }}
          </div>
        </div>

        <div class="transcript-area">
          <div class="transcript-line" *ngFor="let line of transcript">
            <span class="speaker" [class.user]="line.speaker === 'user'">
              {{ line.speaker === 'user' ? '> YOU:' : '< ' + personaName.toUpperCase() + ':' }}
            </span>
            <span class="text">{{ line.text }}</span>
          </div>
          <div class="transcript-line interim" *ngIf="interimTranscript">
            <span class="speaker user">> YOU:</span>
            <span class="text">{{ interimTranscript }}</span>
          </div>
          <div class="transcript-line thinking" *ngIf="aiThinking">
            <span class="speaker">< {{ personaName.toUpperCase() }}:</span>
            <span class="text">...</span>
          </div>
        </div>

        <div class="voice-controls">
          <button class="mic-btn" [class.active]="listening" (click)="toggleMic()" [disabled]="isSpeaking">
            {{ listening ? '[ MUTE ]' : '[ UNMUTE ]' }}
          </button>
          <button class="end-btn" (click)="endSession()">[ END SESSION ]</button>
        </div>

        <div class="error-msg" *ngIf="error">⚠ {{ error }}</div>
        <div class="info-msg" *ngIf="!speechSupported && !error">
          ℹ Speech Recognition not supported. Use Chrome.
        </div>
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
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .close-btn {
      background: none;
      border: 1px solid #666;
      color: #666;
      padding: 5px 10px;
      cursor: pointer;
      font-family: inherit;
    }
    .close-btn:hover { color: #ff6b6b; border-color: #ff6b6b; }
    .voice-visualizer {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      min-height: 100px;
    }
    .waveform { display: flex; align-items: center; gap: 3px; height: 60px; }
    .wave-bar {
      width: 4px;
      background: linear-gradient(to top, #ff6b6b, #ff8f8f);
      transition: height 0.1s ease;
      min-height: 5%;
    }
    .status-icon { font-size: 3rem; opacity: 0.5; transition: all 0.3s ease; }
    .status-icon.active { opacity: 1; animation: pulse 1s infinite; }
    .status-icon.speaking { opacity: 1; color: #00ff88; }
    .transcript-area {
      flex: 1;
      min-height: 150px;
      max-height: 250px;
      overflow-y: auto;
      padding: 15px;
      background: #050505;
      border-top: 1px solid #222;
      border-bottom: 1px solid #222;
    }
    .transcript-line { margin-bottom: 10px; line-height: 1.4; }
    .speaker { color: #00ff88; font-weight: bold; margin-right: 8px; }
    .speaker.user { color: #ff6b6b; }
    .text { color: #ccc; }
    .transcript-line.thinking .text { animation: blink 0.5s infinite; }
    .transcript-line.interim .text { color: #666; font-style: italic; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .voice-controls { display: flex; gap: 10px; padding: 15px; }
    .mic-btn, .end-btn {
      flex: 1;
      padding: 12px;
      border: 1px solid #ff6b6b;
      background: transparent;
      color: #ff6b6b;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .mic-btn:hover, .end-btn:hover { background: #ff6b6b; color: black; }
    .mic-btn.active { background: #ff6b6b; color: black; }
    .mic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-msg, .info-msg {
      background: rgba(255, 0, 0, 0.1);
      border-top: 1px solid #ff6b6b;
      color: #ff6b6b;
      padding: 10px 15px;
      font-size: 0.85rem;
    }
    .info-msg { background: rgba(0, 150, 255, 0.1); border-color: #0096ff; color: #0096ff; }
  `]
})
export class VoiceChatComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  personaName = 'ARIA';
  connected = false;
  listening = false;
  aiThinking = false;
  isSpeaking = false;
  error = '';
  interimTranscript = '';
  transcript: { speaker: 'user' | 'ai'; text: string }[] = [];
  waveformBars: number[] = new Array(20).fill(5);
  speechSupported = false;
  hasInworldTTS = false;

  private mediaStream?: MediaStream;
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private animationFrame?: number;
  private recognition?: any;
  private conversationHistory: { role: string; content: string }[] = [];
  private audioElement?: HTMLAudioElement;

  constructor(private http: HttpClient) { }

  get statusText(): string {
    if (this.error) return '◉ ERROR';
    if (this.isSpeaking) return '◉ SPEAKING';
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
      // Check for Web Speech API support
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        this.speechSupported = true;
      }

      // Get config to check if services are available
      const config = await this.http.get<any>('/api/config').toPromise();

      if (!config.hasGemini) {
        this.error = 'Gemini API not configured. Add key in Settings.';
        return;
      }

      // Enable Inworld TTS if configured
      this.hasInworldTTS = config.hasInworld;

      // Get persona name from voice session endpoint
      if (this.hasInworldTTS) {
        try {
          const sessionInfo = await this.http.get<any>('/api/voice/session').toPromise();
          if (sessionInfo?.persona) {
            this.personaName = sessionInfo.persona;
          }
        } catch (e) {
          console.warn('Could not get voice session info:', e);
        }
      }

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access requires HTTPS or localhost.');
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

      // Initialize speech recognition
      if (this.speechSupported) {
        this.initSpeechRecognition();
      }

      // Welcome message
      this.addAIMessage('Voice link established. Speak to interact.');

    } catch (err: any) {
      console.error('Voice init error:', err);
      if (err.name === 'NotAllowedError') {
        this.error = 'Microphone access denied. Enable permissions.';
      } else {
        this.error = err.message || 'Failed to initialize voice session';
      }
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      this.interimTranscript = interim;

      if (finalTranscript.trim()) {
        this.interimTranscript = '';
        this.handleUserSpeech(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.error = 'Microphone access denied for speech recognition.';
      }
    };

    this.recognition.onend = () => {
      // Restart if still listening
      if (this.listening && this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    // Start listening
    this.startListening();
  }

  private startListening() {
    if (this.recognition && !this.listening) {
      try {
        this.recognition.start();
        this.listening = true;
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }

  private stopListening() {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
        this.listening = false;
        this.interimTranscript = '';
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
    }
  }

  private async handleUserSpeech(text: string) {
    // Add to transcript
    this.transcript.push({ speaker: 'user', text });
    this.scrollTranscript();

    // Get AI response
    this.aiThinking = true;

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: text });

    try {
      const response = await this.http.post<any>('/api/chat/inworld', {
        message: text,
        history: this.conversationHistory.slice(-10)
      }).toPromise();

      this.aiThinking = false;

      if (response?.reply) {
        const aiText = response.reply;
        this.addAIMessage(aiText);
        this.conversationHistory.push({ role: 'assistant', content: aiText });
        this.speakText(aiText);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      this.aiThinking = false;
      this.addAIMessage('Sorry, I encountered an error. Please try again.');
    }
  }

  private addAIMessage(text: string) {
    this.transcript.push({ speaker: 'ai', text });
    this.scrollTranscript();
  }

  private scrollTranscript() {
    setTimeout(() => {
      const area = document.querySelector('.transcript-area');
      if (area) area.scrollTop = area.scrollHeight;
    }, 50);
  }

  private async speakText(text: string) {
    // Stop listening while speaking to avoid feedback
    this.stopListening();
    this.isSpeaking = true;

    // Try Inworld TTS first for high-quality character voice
    if (this.hasInworldTTS) {
      try {
        const response = await this.http.post<any>('/api/tts', { text }).toPromise();
        if (response?.audio) {
          // Play base64 audio
          const audioSrc = `data:audio/mp3;base64,${response.audio}`;
          this.audioElement = new Audio(audioSrc);

          this.audioElement.onended = () => {
            this.isSpeaking = false;
            if (this.connected) {
              this.startListening();
            }
          };

          this.audioElement.onerror = () => {
            console.error('Audio playback error, falling back to Web Speech');
            this.isSpeaking = false;
            this.speakWithWebSpeech(text);
          };

          this.audioElement.play();
          return;
        }
      } catch (err) {
        console.warn('Inworld TTS failed, falling back to Web Speech:', err);
      }
    }

    // Fallback to Web Speech API
    this.speakWithWebSpeech(text);
  }

  private speakWithWebSpeech(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.connected) {
          this.startListening();
        }
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (this.connected) {
          this.startListening();
        }
      };

      speechSynthesis.speak(utterance);
    } else {
      this.isSpeaking = false;
      if (this.connected) {
        this.startListening();
      }
    }
  }

  private startVisualization() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateBars = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      this.waveformBars = this.waveformBars.map((_, i) => {
        const idx = Math.floor(i * dataArray.length / this.waveformBars.length);
        return Math.max(5, (dataArray[idx] / 255) * 100);
      });

      this.animationFrame = requestAnimationFrame(updateBars);
    };

    updateBars();
  }

  toggleMic() {
    if (this.isSpeaking) return;

    if (this.listening) {
      this.stopListening();
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(t => t.enabled = false);
      }
    } else {
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(t => t.enabled = true);
      }
      this.startListening();
    }
  }

  endSession() {
    this.cleanup();
    this.close.emit();
  }

  private cleanup() {
    this.stopListening();
    // Stop Inworld TTS audio if playing
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = undefined;
    }
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
