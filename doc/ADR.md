# Architecture Decision Records — SSO Keycloak POC

This document records all architectural, technical, and UX decisions made during the development of this project. Each record captures the context, the options evaluated, the decision taken, and the consequences.

---

## ADR-001 — Keycloak as Identity Provider

**Date:** 2026-06  
**Status:** Accepted

### Context
The project required a centralized Identity Provider capable of handling OAuth 2.0, OpenID Connect, and token introspection. The IdP needed to support realm-based configuration, client management, and role assignment out of the box.

### Options considered
| Option | Notes |
|--------|-------|
| Keycloak | Open source, battle-tested, native OAuth2/OIDC, Docker-ready, realm export/import |
| Auth0 | Managed SaaS, simpler setup, but external dependency and cost at scale |
| Spring Authorization Server | Native Spring integration, but requires building user management from scratch |
| Okta | Enterprise-grade, but overkill and costly for a POC |

### Decision
**Keycloak 26.x** — open source, self-hosted, and covers all required features natively. The realm export/import mechanism allows the entire IdP configuration to be version-controlled as a JSON file, which aligns with the infrastructure-as-code principle of the project.

### Consequences
- Full control over configuration and data
- Realm auto-import on first boot eliminates manual setup
- Requires Docker to run locally
- `SpringOpaqueTokenIntrospector` deprecated in Spring Security 7 — requires custom introspector implementation

---

## ADR-002 — Opaque Token Introspection over JWT local validation

**Date:** 2026-06  
**Status:** Accepted

### Context
Spring Boot needs to validate the access token on every request. There are two main approaches: validate the JWT locally using the public key, or send the token to Keycloak's introspection endpoint on each request.

### Options considered
| Option | Notes |
|--------|-------|
| JWT local validation | Faster — no network call. But no real-time revocation. |
| Opaque token introspection | Slower — one network call per request. But immediate revocation if token is invalidated in Keycloak. |

### Decision
**Opaque token introspection** — for a POC focused on demonstrating the SSO flow end to end, introspection is the more didactic choice. It makes the validation step explicit and observable.

### Consequences
- Every API request triggers a call to Keycloak
- Real-time token revocation is supported
- Known performance limitation at scale — documented in the article's Production Considerations section
- In production, this would be replaced by an API Gateway that validates the token once and caches the result

---

## ADR-003 — Monorepo structure

**Date:** 2026-06  
**Status:** Accepted

### Context
The project has three independent components — infra, backend, and frontend — each with different toolchains (Docker Compose, Maven, npm). A decision was needed on how to organize them in version control.

### Options considered
| Option | Notes |
|--------|-------|
| Monorepo | Single repository, unified history, easier cross-component commits |
| Multi-repo | One repo per component, stricter separation, but more overhead for a POC |
| Monorepo with workspaces | pnpm/nx for frontend + Maven modules — adds complexity not justified for this scope |

### Decision
**Monorepo** — single repository with three top-level directories (`infra/`, `backend/`, `frontend/`) plus `docs/`. Simpler to clone, run, and reference in the article.

### Consequences
- Single `git clone` to get everything
- Conventional Commits applied across all components
- `README.md` at root serves as the entry point for the entire project
- No workspace tooling needed — each component is independent

---

## ADR-004 — Keycloak realm auto-import via realm-export.json

**Date:** 2026-06  
**Status:** Accepted

### Context
Keycloak configuration (realm, clients, roles, users) needs to be reproducible across environments. The alternative is manual configuration via the admin console, which is not version-controlled.

### Options considered
| Option | Notes |
|--------|-------|
| Manual admin console setup | Not reproducible, not version-controlled |
| realm-export.json with --import-realm | Declarative, version-controlled, auto-applied on first boot |
| Keycloak Terraform provider | Too complex for a POC |

### Decision
**realm-export.json with `--import-realm` flag** — the entire realm configuration is a single JSON file committed to the repository. Keycloak imports it automatically on first boot.

### Consequences
- Environment is fully reproducible with `docker compose up`
- Configuration is version-controlled and diff-able
- To reset: `docker compose down -v && docker compose up -d`
- `directAccessGrantsEnabled: true` was added to `angular-client` to allow token acquisition via curl for testing purposes

---

## ADR-005 — Spring Boot as Resource Server

**Date:** 2026-06  
**Status:** Accepted

### Context
The backend needs to protect REST endpoints, validate Bearer tokens, and enforce RBAC. The stack choice needed to align with the project's Java 21 requirement.

### Options considered
| Option | Notes |
|--------|-------|
| Spring Boot + Spring Security OAuth2 Resource Server | Native integration, well-documented, active community |
| Quarkus | Lighter, faster startup, but less familiar for the target audience |
| Micronaut | Similar tradeoffs to Quarkus |

### Decision
**Spring Boot 3.4.5 with Java 21 and Maven** — the most widely adopted stack for enterprise Java. Spring Security's `oauth2-resource-server` starter provides opaque token introspection with minimal configuration.

### Consequences
- `@EnableMethodSecurity` required for `@PreAuthorize` annotations
- Custom `OpaqueTokenIntrospector` needed to map `realm_access.roles` from Keycloak — Spring does not do this automatically
- `OAuth2IntrospectionAuthenticatedPrincipal` must receive `preferred_username` as first constructor argument for `getName()` to return correctly
- `TenantContextFilter` must be registered after `BearerTokenAuthenticationFilter` — order matters

---

## ADR-006 — Custom role mapping from Keycloak introspection response

**Date:** 2026-06  
**Status:** Accepted

### Context
By default, Spring Security's opaque token introspector maps the token's `scope` values as authorities, not the Keycloak realm roles. The roles are nested inside `realm_access.roles` in the introspection response.

### Options considered
| Option | Notes |
|--------|-------|
| Use scope-based authorities | Does not reflect Keycloak roles — incorrect for RBAC |
| Custom OpaqueTokenIntrospector | Reads realm_access.roles and maps them as GrantedAuthority |
| Keycloak-specific Spring adapter | Deprecated and not maintained for Spring Boot 3.x |

### Decision
**Custom `OpaqueTokenIntrospector`** that delegates to `SpringOpaqueTokenIntrospector`, extracts `realm_access.roles`, and returns an `OAuth2IntrospectionAuthenticatedPrincipal` with the correct authorities and username.

### Consequences
- `preferred_username` used as the principal name — required for `authentication.getName()` to return the correct value
- Role names preserved as-is from Keycloak (`ROLE_USER`, `ROLE_ADMIN`)
- `ClassCastException` avoided by not casting to `DefaultOAuth2AuthenticatedPrincipal` — use `var` and interface methods instead

---

## ADR-007 — TenantContextFilter for per-tenant RBAC

**Date:** 2026-06  
**Status:** Accepted

### Context
The same user can have different roles in different organizations. Roles need to be resolved per request based on both the authenticated user and the active tenant — not solely from the token.

### Options considered
| Option | Notes |
|--------|-------|
| Include tenant roles in the JWT | Would require re-issuing the token on tenant switch — complex and couples IdP to business logic |
| Resolve roles in each controller | Repetitive, error-prone, violates DRY |
| TenantContextFilter — resolve once per request | Clean separation, updates SecurityContext before controller executes |

### Decision
**`TenantContextFilter`** reads the `X-Tenant-ID` header, queries the `user_companies` repository, and replaces the Spring Security context with a new `BearerTokenAuthentication` carrying the tenant-specific roles.

### Consequences
- Filter must run **after** `BearerTokenAuthenticationFilter` — otherwise `SecurityContext` is empty
- Registered with `.addFilterAfter(tenantContextFilter, BearerTokenAuthenticationFilter.class)`
- If `X-Tenant-ID` is absent, the request proceeds with the original Keycloak realm roles
- In-memory `user_companies` data used for simplicity — production would use a database

---

## ADR-008 — Angular 18 with angular-oauth2-oidc over keycloak-angular

**Date:** 2026-06  
**Status:** Accepted

### Context
The Angular SPA needs to implement Authorization Code + PKCE, manage token lifecycle, and support silent refresh. Two libraries were evaluated.

### Options considered
| Option | Notes |
|--------|-------|
| keycloak-angular | Keycloak-specific wrapper, simpler API, but tightly coupled to Keycloak |
| angular-oauth2-oidc | Provider-agnostic, standard OIDC, Discovery Document support, dynamic issuer |

### Decision
**`angular-oauth2-oidc@17`** — provider-agnostic library that speaks standard OIDC. Chosen because the multi-tenant architecture requires the flexibility to configure the issuer dynamically per tenant in future evolutions. Discovery Document support means all endpoints are resolved automatically from the issuer URL.

### Consequences
- `keycloak-angular@16` was initially used and later migrated — migration documented in commit history
- `authInterceptor` must explicitly exclude Keycloak endpoints (`localhost:8080`, `openid-configuration`) to prevent `X-Tenant-ID` from being sent to the IdP — which causes a CORS error
- `refreshToken()` accepts no arguments in `@17` — interceptor uses `hasValidAccessToken()` to conditionally refresh
- Token claims read via `getIdentityClaims()` and `getAccessToken()` — no dependency on Keycloak-specific APIs

---

## ADR-009 — X-Tenant-ID header for tenant context propagation

**Date:** 2026-06  
**Status:** Accepted

### Context
After login, the user selects an organization. The backend needs to know which organization context applies to each request in order to resolve the correct roles.

### Options considered
| Option | Notes |
|--------|-------|
| Include tenant in the JWT | Requires re-issuing token on switch — couples IdP to business logic |
| Query parameter `?tenantId=acme` | Leaks context into URLs, cache-unfriendly |
| Custom HTTP header `X-Tenant-ID` | Clean, standard practice for custom context propagation |
| Separate token per tenant | Complex, requires multiple token management |

### Decision
**`X-Tenant-ID` HTTP header** — injected by `tenantInterceptor` in Angular on every backend request. Excluded from Keycloak-bound requests to prevent CORS errors.

### Consequences
- Backend `TenantContextFilter` reads this header to resolve tenant roles
- Header must be declared in CORS `allowedHeaders` on the backend
- `tenantInterceptor` must skip Keycloak endpoints explicitly
- Tenant context persisted in `sessionStorage` to survive page refreshes — clears when browser tab is closed

---

## ADR-010 — sessionStorage for tenant context persistence

**Date:** 2026-06  
**Status:** Accepted

### Context
After the user selects a tenant, that context must survive page refreshes (`F5`) without requiring re-selection. Three persistence options were evaluated.

### Options considered
| Option | Notes |
|--------|-------|
| In-memory only | Lost on F5 — poor UX |
| sessionStorage | Persists per browser tab, clears on tab close |
| localStorage | Persists across sessions — security concern on shared machines |

### Decision
**`sessionStorage`** — best balance between UX and security for this context. The tenant context survives page refreshes but is automatically cleared when the browser tab is closed.

### Consequences
- `TenantService.getActiveTenant()` reads from memory first, then falls back to `sessionStorage`
- `clearTenant()` removes from both memory and `sessionStorage`
- `logout()` calls `clearTenant()` before `oauthService.logOut()` to ensure clean state

---

## ADR-011 — Welcome modal at AppComponent level for tenant selection

**Date:** 2026-06  
**Status:** Accepted

### Context
After login, the user must select an organization before accessing any protected page. A UX decision was needed on how to present this selection.

### Options considered
| Option | Notes |
|--------|-------|
| Dedicated /select-tenant route | Causes a full route change — feels disjointed |
| Modal rendered in PeopleComponent | Couples tenant selection to a specific page |
| Modal rendered in AppComponent | Cross-cutting concern — applies to every route |

### Decision
**Modal rendered in `AppComponent`** — tenant selection is a cross-cutting concern. It should apply to every route, not just `/people`. The modal is controlled by a `BehaviorSubject` (`showModal$`) in `TenantService`, opened by `tenantGuard` when no active tenant is found.

### Consequences
- `SelectTenantComponent` page and `/select-tenant` route were removed
- `tenantGuard` opens the modal instead of redirecting
- Modal displays user's full name (from `name` claim in the token) and a "Authentication provided by Keycloak" footer — acknowledging the origin of authentication
- Navigation to `/people` triggered by the modal after tenant selection

---

## ADR-012 — Tenant switcher dropdown in the header

**Date:** 2026-06  
**Status:** Accepted

### Context
After selecting a tenant via the welcome modal, users needed a way to switch organizations during the session without logging out. Two UX patterns were evaluated.

### Options considered
| Option | Notes |
|--------|-------|
| Modal only (no switcher) | User must logout and re-login to switch — poor UX for multi-tenant users |
| Dropdown in header | Always visible, standard SaaS pattern (GitHub Orgs, Vercel Teams, Slack) |

### Decision
**Dropdown in the header** as an evolution of the modal. The modal handles the first selection after login; the dropdown handles subsequent switches during the session. Switching calls `POST /auth/switch-tenant`, updates `sessionStorage`, and reloads the page data.

### Consequences
- `TenantService` now exposes `tenantChanged$` observable — components subscribe to react to tenant switches without full page reload
- `PeopleComponent` reloads people list on tenant change and updates `isAdmin` based on new tenant roles
- `window.location.reload()` avoided in favor of reactive data reload

---

## ADR-013 — In-memory data for users, companies, and roles

**Date:** 2026-06  
**Status:** Accepted (POC simplification)

### Context
The multi-tenant RBAC model requires a data store for the `user_companies` relationship. For the POC, a decision was needed on whether to use a real database or in-memory data.

### Options considered
| Option | Notes |
|--------|-------|
| PostgreSQL with JPA/Hibernate | Production-ready, but adds significant complexity to the POC |
| In-memory data in a @Repository class | Simple, zero setup, sufficient to demonstrate the flow |

### Decision
**In-memory data** in `TenantRepository` — a `@Repository` class with static lists of `Company` and `UserCompany` records. This keeps the focus on the SSO and RBAC flow rather than database setup.

### Consequences
- Data resets on every backend restart
- No persistence layer to configure or migrate
- Documented as an intentional simplification — production would replace with JPA repository and proper schema
- `user_companies` model reflects the real-world pattern: `username + companyId → roles[]`

---

## ADR-014 — HTTP call in PeopleComponent (no service layer)

**Date:** 2026-06  
**Status:** Accepted (POC simplification)

### Context
The `PeopleComponent` makes HTTP calls directly via `HttpClient`. The standard Angular pattern would extract this into a `PeopleService` with environment-based URLs.

### Options considered
| Option | Notes |
|--------|-------|
| Direct HTTP in component | Simpler for POC — keeps everything visible in one place |
| PeopleService with environment.ts | Production pattern — separates concerns, supports multiple environments |

### Decision
**Direct HTTP in component** — intentional simplification to keep the POC focused on the SSO and RBAC flow rather than Angular best practices.

### Consequences
- API URL (`http://localhost:8081`) is hardcoded in the component
- Documented in the article as a conscious tradeoff
- Production code should extract to `PeopleService` with URLs from `environment.ts`

---

## ADR-015 — HTTPS excluded from POC scope

**Date:** 2026-06  
**Status:** Accepted (out of scope)

### Context
HTTPS is mandatory in production for any authentication flow. The decision was whether to include it in the POC.

### Options considered
| Option | Notes |
|--------|-------|
| Include HTTPS with self-signed certificate | Adds setup complexity (mkcert, keystore, angular.json ssl config) without didactic value |
| Exclude from POC scope | Keeps focus on the SSO flow — HTTPS is infrastructure, not identity |

### Decision
**Excluded from POC scope** — HTTPS adds no didactic value to demonstrating SSO, PKCE, token introspection, or multi-tenant RBAC. The article documents it as a production requirement.

### Consequences
- All services run on HTTP locally
- Browser security warnings are avoided by running on localhost
- Production note in the article clarifies that all traffic must be encrypted with valid certificates

---

*Last updated: 2026-06*  
*Project: [sso-keycloak-poc](https://github.com/your-username/sso-keycloak-poc)*