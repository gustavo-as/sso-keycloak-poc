import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOAuthClient, OAuthService } from 'angular-oauth2-oidc';
import { authInterceptor } from './interceptors/auth.interceptor';
import { routes } from './app.routes';
import { tenantInterceptor } from './interceptors/tenant.interceptor';

function initializeOAuth(oauthService: OAuthService) {
  return async () => {
    oauthService.configure({
      issuer: 'http://localhost:8080/realms/sso-keycloak-poc',
      clientId: 'angular-client',
      redirectUri: window.location.origin,
      responseType: 'code',
      scope: 'openid profile email',
      showDebugInformation: true,
      requireHttps: false,
    });

    await oauthService.loadDiscoveryDocumentAndTryLogin();

    if (!oauthService.hasValidAccessToken()) {
      oauthService.initCodeFlow();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([
      authInterceptor,
      tenantInterceptor
    ])),
    provideOAuthClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeOAuth,
      multi: true,
      deps: [OAuthService],
    },
  ],
};