import { Routes } from '@angular/router';
import { NewsPageComponent } from './news-page.component';
import { AdminSettingsComponent } from './admin-settings.component';
import { ServicesManagementComponent } from './services-management.component';

export const routes: Routes = [
    { path: 'news', component: NewsPageComponent },
    { path: 'settings', component: AdminSettingsComponent },
    { path: 'services', component: ServicesManagementComponent }
];
