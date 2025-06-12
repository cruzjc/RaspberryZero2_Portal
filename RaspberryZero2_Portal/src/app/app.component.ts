import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'RaspberryZero2_Portal';
  currentDate = new Date();

  
  sessionActive = false;
  sessionId = '';
  transcript: string[] = [];
  private pc?: RTCPeerConnection;
  private ephemeralKey = '';
  
  
  constructor(private http: HttpClient) {
    setInterval(() => (this.currentDate = new Date()), 1000);
  }


  async startCall(): Promise<void> {
    try {
      const tokenResponse = await firstValueFrom(this.http.get<any>('/session'));
      this.ephemeralKey = tokenResponse.client_secret.value;
      this.sessionId = tokenResponse.id;
    } catch (err) {
      console.error('Error starting call', err);
      return;
    }

    this.transcript = [];
    this.sessionActive = true;

    // Create a peer connection
    this.pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    this.pc.ontrack = e => audioEl.srcObject = e.streams[0];

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    this.pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = this.pc.createDataChannel("oai-events");
    dc.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.delta) {
          this.transcript.push(msg.delta);
        } else if (msg.text) {
          this.transcript.push(msg.text);
        }
      } catch {
        this.transcript.push(e.data);
      }
    });

    // Start the session using the Session Description Protocol (SDP)
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-mini-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${this.ephemeralKey}`,
        "Content-Type": "application/sdp"
      },
    });

    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: await sdpResponse.text(),
    });
    await this.pc.setRemoteDescription(answer);
  }

  endCall(): void {
    this.pc?.close();
    this.pc = undefined;
    this.sessionActive = false;
  }
}
