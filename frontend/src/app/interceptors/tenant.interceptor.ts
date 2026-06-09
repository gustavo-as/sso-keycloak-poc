import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../services/tenant.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantService);
  const activeTenant = tenantService.getActiveTenant();

  if (activeTenant) {
    const tenantReq = req.clone({
      setHeaders: {
        'X-Tenant-ID': activeTenant.companyId,
      },
    });
    return next(tenantReq);
  }

  return next(req);
};