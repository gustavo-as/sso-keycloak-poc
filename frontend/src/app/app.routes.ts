import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'people',
    pathMatch: 'full',
  },
  {
    path: 'people',
    loadComponent: () =>
      import('./pages/people/people.component').then(
        (m) => m.PeopleComponent
      ),
      canActivate: [authGuard],
  },
];