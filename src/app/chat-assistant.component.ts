import { Component, EventEmitter, Output, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatResponse {
    reply: string;
    persona: string;
    systemStatus?: string;
}

@Component({
    selector: 'app-chat-assistant',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="chat-overlay" (click)="close.emit()">
      <div class="chat-modal" (click)="$event.stopPropagation()">
        <header class="chat-header">
          <div class="persona-info">
            <span class="persona-icon">🤖</span>
            <span class="persona-name">{{ personaName }}</span>
            <span class="connection-status" [class.connected]="!loading">
              {{ loading ? '◉ PROCESSING' : '◉ LINK_ACTIVE' }}
            </span>
          </div>
          <button class="close-btn" (click)="close.emit()">[ X ]</button>
        </header>

        <div class="chat-messages" #messageContainer>
          <div class="welcome-msg" *ngIf="messages.length === 0">
            <div class="ascii-art">
    ╔══════════════════════════════════════╗
    ║       LINK ESTABLISHED               ║
    ║   AI Assistant Online                ║
    ╚══════════════════════════════════════╝
            </div>
            <p>Connection to {{ personaName }} established.</p>
            <p class="hint">Ask about system status, services, or anything else.</p>
          </div>

          <div class="message" 
               *ngFor="let msg of messages" 
               [class.user]="msg.role === 'user'"
               [class.assistant]="msg.role === 'assistant'">
            <span class="msg-prefix">{{ msg.role === 'user' ? '> USER:' : '< ' + personaName.toUpperCase() + ':' }}</span>
            <span class="msg-content">{{ msg.content }}</span>
          </div>

          <div class="message assistant thinking" *ngIf="loading">
            <span class="msg-prefix">< {{ personaName.toUpperCase() }}:</span>
            <span class="msg-content">▌</span>
          </div>
        </div>

        <div class="error-msg" *ngIf="error">⚠ {{ error }}</div>

        <form class="chat-input" (ngSubmit)="sendMessage()">
          <span class="input-prefix">&gt;</span>
          <input 
            type="text" 
            [(ngModel)]="inputMessage" 
            name="message"
            placeholder="Enter command or query..."
            [disabled]="loading"
            autocomplete="off"
            autofocus
          />
          <button type="submit" [disabled]="loading || !inputMessage.trim()">[ SEND ]</button>
        </form>
      </div>
    </div>
  `,
    styles: [`
    .chat-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .chat-modal {
      width: 90%;
      max-width: 700px;
      height: 80vh;
      max-height: 600px;
      background: #0a0a0a;
      border: 2px solid var(--text-primary, #00ff88);
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid var(--text-secondary, #666);
      background: #111;
    }

    .persona-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .persona-icon { font-size: 1.2rem; }
    .persona-name { 
      color: var(--text-highlight, #00ffff); 
      font-weight: bold; 
      text-transform: uppercase;
    }
    .connection-status {
      font-size: 0.75rem;
      color: var(--text-alert, #ff6b6b);
      padding: 2px 8px;
      border: 1px solid currentColor;
    }
    .connection-status.connected {
      color: var(--text-primary, #00ff88);
    }

    .close-btn {
      background: transparent;
      border: 1px solid var(--text-alert, #ff6b6b);
      color: var(--text-alert, #ff6b6b);
      padding: 5px 10px;
      cursor: pointer;
      font-family: inherit;
    }
    .close-btn:hover { background: var(--text-alert, #ff6b6b); color: black; }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      font-family: var(--font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.9rem;
    }

    .welcome-msg {
      color: var(--text-secondary, #888);
      text-align: center;
      padding: 20px;
    }
    .ascii-art {
      font-size: 0.75rem;
      color: var(--text-primary, #00ff88);
      white-space: pre;
      margin-bottom: 15px;
    }
    .hint { font-size: 0.8rem; color: var(--text-secondary, #666); }

    .message {
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .msg-prefix {
      color: var(--text-secondary, #888);
      margin-right: 8px;
    }
    .message.user .msg-prefix { color: var(--text-highlight, #00ffff); }
    .message.assistant .msg-prefix { color: var(--text-primary, #00ff88); }
    .msg-content { color: var(--text-primary, #ddd); white-space: pre-wrap; }
    .message.user .msg-content { color: var(--text-highlight, #00ffff); }

    .thinking .msg-content {
      animation: blink 0.5s infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .error-msg {
      background: rgba(255, 100, 100, 0.2);
      color: var(--text-alert, #ff6b6b);
      padding: 8px 15px;
      border-left: 3px solid var(--text-alert, #ff6b6b);
      font-size: 0.85rem;
    }

    .chat-input {
      display: flex;
      align-items: center;
      padding: 10px 15px;
      border-top: 1px solid var(--text-secondary, #666);
      background: #111;
      gap: 10px;
    }
    .input-prefix { 
      color: var(--text-primary, #00ff88); 
      font-weight: bold; 
    }
    .chat-input input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary, #00ff88);
      font-family: inherit;
      font-size: 0.95rem;
      outline: none;
    }
    .chat-input input::placeholder {
      color: var(--text-secondary, #666);
    }
    .chat-input button {
      background: var(--text-primary, #00ff88);
      color: black;
      border: none;
      padding: 8px 15px;
      font-family: inherit;
      font-weight: bold;
      cursor: pointer;
    }
    .chat-input button:hover:not(:disabled) { opacity: 0.8; }
    .chat-input button:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class ChatAssistantComponent implements OnInit, AfterViewChecked {
    @Output() close = new EventEmitter<void>();
    @ViewChild('messageContainer') private messageContainer!: ElementRef;

    messages: ChatMessage[] = [];
    inputMessage = '';
    loading = false;
    error = '';
    personaName = 'Assistant';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        // Focus input on open
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        try {
            this.messageContainer.nativeElement.scrollTop =
                this.messageContainer.nativeElement.scrollHeight;
        } catch (e) { }
    }

    sendMessage() {
        if (!this.inputMessage.trim() || this.loading) return;

        const userMessage = this.inputMessage.trim();
        this.inputMessage = '';
        this.error = '';

        // Add user message
        this.messages.push({ role: 'user', content: userMessage });
        this.loading = true;

        // Send to backend
        this.http.post<ChatResponse>('/api/chat/inworld', {
            message: userMessage,
            history: this.messages.slice(0, -1) // Exclude current message
        }).subscribe({
            next: (response) => {
                this.loading = false;
                this.personaName = response.persona || 'Assistant';
                this.messages.push({ role: 'assistant', content: response.reply });
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Failed to get response';
                console.error('Chat error:', err);
            }
        });
    }
}
