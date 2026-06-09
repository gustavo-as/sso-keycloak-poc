import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';

export const tenantGuard: CanActivateFn = () => {
  const tenantService = inject(TenantService);

  if (tenantService.hasActiveTenant()) {
    return true;
  }

  tenantService.openModal();
  return false;
};