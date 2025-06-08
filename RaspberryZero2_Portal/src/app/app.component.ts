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
  constructor(private http: HttpClient) {}

  startCall(): void {
    this.http.post<{ message: string }>('/api/start-call', {}).subscribe({
      next: (res) => console.log(res.message),
      error: (err) => console.error('Error starting call', err),
    });
  }
}
