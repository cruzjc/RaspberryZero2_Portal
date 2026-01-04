import { Routes } from '@angular/router';
import { NewsPageComponent } from './news-page.component';
import { NewsSettingsComponent } from './news-settings.component';
import { AdminSettingsComponent } from './admin-settings.component';

export const routes: Routes = [
    { path: 'news', component: NewsPageComponent },
    { path: 'news-settings', component: NewsSettingsComponent },
    { path: 'settings', component: AdminSettingsComponent }
];
