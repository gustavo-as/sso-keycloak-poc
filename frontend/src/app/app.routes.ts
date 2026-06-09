import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { tenantGuard } from './guards/tenant.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'select-tenant',
    pathMatch: 'full',
  },
  {
    path: 'select-tenant',
    loadComponent: () =>
      import('./pages/select-tenant/select-tenant.component').then(
        (m) => m.SelectTenantComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'people',
    loadComponent: () =>
      import('./pages/people/people.component').then(
        (m) => m.PeopleComponent
      ),
      canActivate: [authGuard, tenantGuard],
  },
];