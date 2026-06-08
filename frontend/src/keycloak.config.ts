import Keycloak from 'keycloak-js';

export const keycloakConfig: Keycloak.KeycloakConfig = {
  url: 'http://localhost:8080',
  realm: 'sso-keycloak-poc',
  clientId: 'angular-client',
};