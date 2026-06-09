import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { from, switchMap, catchError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);

  // Skip Keycloak and auth-related requests
  if (req.url.includes('localhost:8080') || req.url.includes('openid-configuration')) {
    return next(req);
  }

  const hasToken = !!oauthService.getAccessToken();
  const isValid = oauthService.hasValidAccessToken();

  if (!hasToken) {
    return next(req);
  }

  if (isValid) {
    return next(
      req.clone({
        setHeaders: { Authorization: `Bearer ${oauthService.getAccessToken()}` },
      })
    );
  }

  return from(oauthService.refreshToken()).pipe(
    switchMap(() =>
      next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${oauthService.getAccessToken()}` },
        })
      )
    ),
    catchError(() => next(req))
  );
};