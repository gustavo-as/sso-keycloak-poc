# SSO in Practice: building centralized authentication with Keycloak, Spring Boot, and Angular

> All source code is available at [github.com/gustavo-as/sso-keycloak-poc](https://github.com/gustavo-as/sso-keycloak-poc)

---

## Introduction

Imagine you work at a company that uses five different internal tools: a project management board, a CRM, a data dashboard, a document editor, and a deployment platform. Every morning, you log into each one separately. Every week, at least one of them logs you out unexpectedly. Every month, someone on the team forgets a password and IT opens a ticket.

This is not a hypothetical — it is the reality of most organizations that grow their toolset faster than their identity strategy.

**Single Sign-On (SSO)** solves this. It centralizes authentication into a single Identity Provider (IdP), so users authenticate once and move freely across every connected system. No repeated logins. No fragmented sessions. No passwords stored in application databases.

In this article, we build SSO from scratch — a fully working proof-of-concept that covers the complete flow: from the first redirect to Keycloak, through token introspection in Spring Boot, all the way to role-based access control per tenant in an Angular SPA.

By the end, you will have a clear mental model of how modern authentication works, why each piece exists, and how to adapt this architecture to a real-world SaaS product.

### What we will build

- A **Keycloak** instance configured as a centralized Identity Provider, running locally via Docker Compose
- A **Spring Boot** Resource Server that validates tokens via introspection — never storing credentials
- An **Angular 18** SPA implementing the Authorization Code + PKCE flow
- A **multi-tenant** architecture where the same user can hold different roles in different organizations
- A **tenant switcher** in the UI that switches context without requiring a new login

### What you should already know

This article assumes basic familiarity with Spring Boot and Angular. We will explain every security concept from first principles, but we will not explain what a REST endpoint or an Angular component is.

---

## Core Concepts

Before writing a single line of code, it is worth understanding the protocols and terminology that make SSO work. These concepts appear throughout the implementation — knowing them upfront will make every decision feel intentional rather than arbitrary.

### What is SSO?

Single Sign-On is an authentication pattern where a user logs in once to a centralized Identity Provider and gains access to multiple applications without logging in again. The key word is *centralized* — credentials never leave the IdP. Applications only receive a token that proves the user authenticated.

### OAuth 2.0 and OpenID Connect

**OAuth 2.0** is an authorization framework that defines how an application can obtain limited access to a resource on behalf of a user. It does not define authentication — it defines delegation.

**OpenID Connect (OIDC)** is a thin identity layer built on top of OAuth 2.0. It adds the concept of the `ID Token` — a signed statement that says "this user authenticated, and here is who they are." When people say SSO with OAuth, they almost always mean OAuth 2.0 + OIDC together.

### Authorization Code + PKCE

For browser-based SPAs like our Angular app, the correct OAuth 2.0 flow is **Authorization Code with PKCE** (Proof Key for Code Exchange).

The SPA generates a random `code_verifier` and derives a `code_challenge` from it. The user is redirected to Keycloak with the `code_challenge`, authenticates, and Keycloak redirects back with an authorization `code`. The SPA then exchanges that `code` plus the original `code_verifier` for an `access_token`.

The `code_verifier` never leaves the browser session. Even if an attacker intercepts the authorization `code`, they cannot exchange it for a token without the verifier. This is why PKCE replaced the older Implicit Flow for SPAs.

### Tokens

Three types of tokens appear in this project:

| Token | Purpose | Who reads it |
|-------|---------|--------------|
| `access_token` | Proves the user is authenticated and authorized | Resource Server (Spring Boot) |
| `id_token` | Contains user identity claims — name, email | Client application (Angular) |
| `refresh_token` | Used to obtain a new `access_token` without re-login | Client application (Angular) |

### Token Introspection

Instead of validating the token locally, our Spring Boot API sends the token to Keycloak's introspection endpoint and asks: *"Is this token valid? Who does it belong to?"* Keycloak responds with the token's claims and an `active: true` or `active: false` field.

This approach has a deliberate tradeoff — covered in the Production Considerations section.

### RBAC — Role-Based Access Control

In our project, roles exist at two levels:

- **Realm roles** — defined in Keycloak, included in the token (`ROLE_USER`, `ROLE_ADMIN`)
- **Tenant roles** — defined in our application's `user_companies` table, resolved per request via the `X-Tenant-ID` header

This distinction matters: Keycloak knows *who you are*, but our application decides *what you can do in each organization*.

---

## Architecture Overview

![SSO Architecture](doc/architecture.png)

### Components

**Keycloak** acts as the centralized Identity Provider. It owns the login screen, issues tokens, and answers introspection requests. No application in this architecture stores or validates passwords — that responsibility belongs entirely to Keycloak.

**Angular SPA** implements the Authorization Code + PKCE flow, stores the access token in memory, and attaches it as a Bearer token on every request to the API. It also manages tenant context — after login, the user selects which organization they want to work with, and that context travels with every subsequent request via the `X-Tenant-ID` header.

**Spring Boot API** is the Resource Server. On every incoming request, it sends the Bearer token to Keycloak's introspection endpoint to verify its validity. If a `X-Tenant-ID` header is present, the `TenantContextFilter` resolves the user's roles for that specific tenant and updates the Spring Security context accordingly.

**PostgreSQL** stores Keycloak's internal data — realms, clients, users, and sessions. From our application's perspective, it is an infrastructure implementation detail.

### Request flow

| Step | Description |
|------|-------------|
| ① | User opens the SPA — Angular detects no valid token and initiates PKCE flow |
| ② | Browser redirects to Keycloak login page |
| ③ | User authenticates — Keycloak redirects back with an authorization code |
| ④ | Angular exchanges the code + code_verifier for an access_token |
| ⑤ | Angular calls `GET /me/companies` — Spring Boot validates token via introspection |
| ⑥ | User selects an organization in the welcome modal |
| ⑦ | Angular calls `POST /auth/switch-tenant` — Spring Boot returns tenant roles |
| ⑧ | Angular stores the active tenant in sessionStorage |
| ⑨ | Angular sends `Authorization: Bearer <token>` + `X-Tenant-ID: acme` to the API |
| ⑩ | TenantContextFilter resolves roles — response based on user's role in that tenant |

### Multi-tenancy model

One aspect of this architecture that goes beyond basic SSO is the multi-tenant RBAC model. The same user can belong to multiple organizations with different roles in each:

```
user@poc.dev + Acme Corp  → ROLE_USER  (can view people)
user@poc.dev + Globex Inc → ROLE_ADMIN (can view and delete people)
```

This is implemented through a `user_companies` table that maps users to organizations and their respective roles. The active tenant is communicated via the `X-Tenant-ID` request header, and the `TenantContextFilter` uses it to override the Spring Security context with the correct roles for that request.

This pattern reflects how real SaaS applications handle multi-tenancy — not by creating separate realms or databases per tenant, but by managing context at the application level while keeping identity centralized.

---

## Setting Up the Infrastructure

The entire infrastructure runs locally via Docker Compose — Keycloak and PostgreSQL start with a single command, and the Keycloak realm is imported automatically on first boot.

### Project structure

```
sso-keycloak-poc/
├── infra/
│   ├── docker-compose.yml
│   └── keycloak/
│       └── realm-export.json
├── backend/
├── frontend/
└── docs/
```

### Docker Compose

The `docker-compose.yml` defines two services: PostgreSQL 16 and Keycloak 26.

Two details are worth noting. First, the `--import-realm` flag tells Keycloak to look for JSON files in the import directory on startup and load them automatically — no manual configuration needed. Second, the `depends_on` with `condition: service_healthy` ensures Keycloak only starts after PostgreSQL is fully ready, avoiding a common race condition.

The full file is available at [`infra/docker-compose.yml`](../infra/docker-compose.yml).

### Realm configuration

The `realm-export.json` file pre-configures everything Keycloak needs. Rather than clicking through the admin console manually, the entire realm setup is declarative and version-controlled.

**Two clients are defined:**

- `angular-client` — a public client for the Angular SPA. Public means no client secret, which is correct for browser-based applications. Configured with `pkce.code.challenge.method: S256` and a redirect URI pointing to `http://localhost:4200`.
- `spring-client` — a confidential client used exclusively by the Spring Boot API to call the introspection endpoint. It has a client secret and no login flows enabled.

**Two realm roles:** `ROLE_USER` and `ROLE_ADMIN`.

**Two test users:**

| Username | Password | Roles |
|----------|----------|-------|
| `user@poc.dev` | `password` | `ROLE_USER` |
| `admin@poc.dev` | `password` | `ROLE_USER`, `ROLE_ADMIN` |

### Starting the environment

```bash
cd infra
docker compose up -d
```

Keycloak will be available at `http://localhost:8080` (admin / admin). To reset and force a fresh realm import:

```bash
docker compose down -v && docker compose up -d
```

---

## Building the Resource Server

The Spring Boot API is a Resource Server — it protects endpoints and validates tokens, but never handles authentication directly.

### Stack

- Java 21, Spring Boot 3.4.5, Maven
- `spring-boot-starter-oauth2-resource-server` for opaque token introspection
- `spring-boot-starter-security` with `@EnableMethodSecurity`

The full source is available at [`backend/`](../backend).

### Security configuration

Spring Security is configured to use opaque token introspection pointing to Keycloak's endpoint. The configuration lives in `SecurityConfig.java` and wires together three concerns: CORS, endpoint authorization, and token introspection with custom role mapping.

### Custom role mapping

This is one of the less obvious parts of integrating Spring Security with Keycloak. By default, Spring's opaque token introspector maps the token's `scope` values as authorities — not the Keycloak realm roles.

The roles are nested inside `realm_access.roles` in the introspection response, but Spring does not map them automatically. A custom `OpaqueTokenIntrospector` extracts them and registers them as proper `GrantedAuthority` objects.

See [`SecurityConfig.java`](../backend/src/main/java/dev/poc/sso/config/SecurityConfig.java) for the full implementation.

### Tenant context filter

The `TenantContextFilter` runs after `BearerTokenAuthenticationFilter` — meaning the token has already been validated and the user is authenticated before this filter executes.

It reads the `X-Tenant-ID` header, looks up the user's roles for that tenant from the repository, and replaces the Spring Security context with a new authentication object carrying the tenant-specific roles.

Filter order matters here. Registering `TenantContextFilter` before `BearerTokenAuthenticationFilter` would mean the `SecurityContext` is empty when it executes — `authentication.getName()` would return `null`.

See [`TenantContextFilter.java`](../backend/src/main/java/dev/poc/sso/config/TenantContextFilter.java) for the full implementation.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/me/companies` | ✅ | Returns organizations the authenticated user belongs to |
| `POST` | `/auth/switch-tenant` | ✅ | Validates tenant access and returns user roles for it |
| `GET` | `/people` | ✅ | Returns a list of people |
| `DELETE` | `/people/{id}` | ✅ `ROLE_ADMIN` | Deletes a person — requires admin role in the active tenant |
| `GET` | `/actuator/health` | ❌ | Health check |

> **Production note:** The people list is stored in memory for simplicity. In a production application, this would be backed by a database with proper repository and service layers. The HTTP call is also made directly in the component — a deliberate simplification for the POC. Production code should extract this to a dedicated service with environment-based URLs.

---

## Building the Angular SPA

The frontend is an Angular 18 standalone application using `angular-oauth2-oidc@17` for the PKCE flow.

### Why angular-oauth2-oidc?

We chose `angular-oauth2-oidc` over `keycloak-angular` because it is **provider-agnostic** — it speaks standard OIDC, not Keycloak-specific APIs. This makes it the right choice for multi-tenant scenarios where the issuer could vary dynamically per tenant.

The library discovers all endpoints automatically via the OpenID Connect Discovery Document (`/.well-known/openid-configuration`), so we only need to provide the `issuer` URL.

The full source is available at [`frontend/`](../frontend).

### Authentication flow

On startup, the app loads the Discovery Document from Keycloak, checks for a valid token, and initiates the PKCE flow if none is found. This is configured in `app.config.ts` via `APP_INITIALIZER`.

### Auth interceptor

The `authInterceptor` attaches the Bearer token to every outgoing request. It also handles silent refresh — if the token is expired, it calls `refreshToken()` before sending the request, keeping the user session alive without interruption.

Keycloak-bound requests (discovery document, token endpoint) are explicitly excluded from the interceptor to prevent the `X-Tenant-ID` header from being sent to Keycloak — which would cause a CORS error.

### Tenant interceptor

The `tenantInterceptor` reads the active tenant from `TenantService` and injects `X-Tenant-ID` into every request directed at the backend. Keycloak endpoints are excluded from this interceptor as well.

### Guards

Two guards protect the routes:

- `authGuard` — checks for a valid access token. If none exists, initiates the PKCE flow.
- `tenantGuard` — checks for an active tenant context. If none exists, opens the tenant selection modal.

### Tenant selection modal

After login, before accessing any protected page, the user sees a welcome modal listing the organizations they belong to. Selecting one calls `POST /auth/switch-tenant`, stores the result in `sessionStorage`, and navigates to `/people`.

The modal is rendered at the `AppComponent` level — not inside a specific page — because tenant context is a cross-cutting concern that applies to every route.

### Tenant switcher

Once a tenant is selected, a dropdown in the header allows switching organizations without logging out. Switching calls `switch-tenant` again, updates `sessionStorage`, and reloads the people list with the new context.

### RBAC in the UI

The component reads the active tenant's roles from `TenantService` — not from the JWT directly. This ensures the UI reflects the tenant-specific roles, not the global realm roles.

```
user@poc.dev selects Acme Corp  → roles: [ROLE_USER]  → no Delete button
user@poc.dev selects Globex Inc → roles: [ROLE_ADMIN] → Delete button visible
```

---

## Seeing It All Together

With all three services running, the complete flow looks like this:

**Start everything:**

```bash
# Terminal 1
cd infra && docker compose up -d

# Terminal 2
cd backend && ./mvnw spring-boot:run

# Terminal 3
cd frontend && ng serve
```

Open `http://localhost:4200`. You will be redirected to the Keycloak login page — note the URL is `localhost:8080`, not `localhost:4200`. The login screen belongs to the Identity Provider, not the application. This is intentional and is one of the core benefits of SSO.

After logging in, the welcome modal appears with the organizations available to the user. Selecting one sets the tenant context. The `/people` page loads with data from the backend, and the header shows the active organization and the user's role within it.

Logging in with `user@poc.dev` and selecting Globex Inc shows the Delete button — because that user is `ROLE_ADMIN` in Globex, even though they are only `ROLE_USER` in Acme Corp.

---

## Production Considerations

This POC makes several deliberate simplifications. Here is what would need to change before going to production.

### HTTPS

The POC runs over HTTP. In production, all traffic must be encrypted. Keycloak supports HTTPS natively — set `KC_HOSTNAME` and provide a valid certificate. The Angular app and Spring Boot API would also need TLS termination, typically handled by a reverse proxy or load balancer.

### Secrets management

Client secrets and database passwords are hardcoded in configuration files. In production, use a secrets manager — AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets — and inject them at runtime via environment variables.

### Token refresh and logout

The POC implements silent token refresh via `refreshToken()`. In production, also implement backchannel logout — Keycloak can notify the backend when a session is invalidated, allowing immediate revocation across all services.

### Service layer and environment URLs

The HTTP call to `/people` is made directly in `PeopleComponent`. In production, extract this to a `PeopleService` with URLs configured via Angular's `environment.ts` files, making it trivial to switch between development, staging, and production endpoints.

### Per-request introspection

Every API request currently triggers a call to Keycloak for token validation. At scale, this creates unnecessary latency and load on the Identity Provider — and is a known limitation of this POC architecture.

---

## Conclusion

We started with a simple question — how do you stop asking users to log in multiple times — and built a complete answer from infrastructure to UI.

The architecture we built demonstrates several patterns that matter in real-world systems:

- **Centralized identity** — one IdP, consistent authentication across every service
- **Stateless API** — the backend holds no session state; every request is self-contained
- **Tenant-aware RBAC** — the same user can hold different roles in different organizations, resolved at the request level without re-authentication
- **Separation of concerns** — Keycloak owns authentication, the application owns authorization context

The source code, architecture diagram, and all design decisions are documented in the repository. Every tradeoff made in this POC is intentional — the production considerations section maps each simplification to its production equivalent.

SSO is not a feature — it is an architectural decision. Getting it right from the start means users never have to think about authentication again.

> Source code: [github.com/gustavo-as/sso-keycloak-poc](https://github.com/gustavo-as/sso-keycloak-poc)

---

*Written as part of a portfolio project — feedback welcome via GitHub Issues.*