import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../services/tenant.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantService);

  // Skip Keycloak and auth-related requests
  if (req.url.includes('localhost:8080') || req.url.includes('openid-configuration')) {
    return next(req);
  }

  const activeTenant = tenantService.getActiveTenant();

  if (activeTenant) {
    return next(
      req.clone({
        setHeaders: { 'X-Tenant-ID': activeTenant.companyId },
      })
    );
  }

  return next(req);
};