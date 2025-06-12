import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'RaspberryZero2_Portal';
  currentDate = new Date();

  constructor(private http: HttpClient) {
    setInterval(() => (this.currentDate = new Date()), 1000);
  }

  async startCall(): Promise<void> {
    let tokenResponse;
    let EPHEMERAL_KEY;
    this.http.get<any>('/session').subscribe({
      next: (res) => {
        tokenResponse = res;
        EPHEMERAL_KEY = tokenResponse.client_secret.value;
      },
      error: (err) => console.error('Error starting call', err),
    });

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    pc.ontrack = e => audioEl.srcObject = e.streams[0];

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    dc.addEventListener("message", (e) => {
      // Realtime server events appear here!
      console.log(e);
    });

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-mini-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      },
    });

    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: await sdpResponse.text(),
    });
    await pc.setRemoteDescription(answer);
  }
}
