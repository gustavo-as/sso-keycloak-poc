import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

export const authGuard: CanActivateFn = async () => {
  const oauthService = inject(OAuthService);

  if (oauthService.hasValidAccessToken()) {
    return true;
  }
oauthService.initCodeFlow();
  return false;
};