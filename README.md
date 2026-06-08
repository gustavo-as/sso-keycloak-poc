<div align="center">

# SSO Keycloak POC

**A proof-of-concept for centralized authentication using Keycloak, Spring Boot, and Angular.**

</div>

---

## Overview

This repository is a proof-of-concept (POC) demonstrating how to build **Single Sign-On (SSO)** from scratch using industry-standard protocols. It was built as portfolio material and accompanies a step-by-step article walking through every design decision.

The project shows how to:

- Configure **Keycloak** as a centralized Identity Provider (IdP)
- Implement the **Authorization Code + PKCE** flow in an Angular SPA
- Protect a **Spring Boot** REST API using OAuth2 Resource Server
- Validate access tokens via **Token Introspection** without sharing secrets with the frontend
- Wire everything together locally with **Docker Compose**

---

## Architecture

![SSO Architecture](doc/sso-arch.png)

### Flow breakdown
 
| Step | Description |
|------|-------------|
| 1 | User opens the SPA and is redirected to Keycloak for authentication |
| 2 | Keycloak issues an `access_token` and returns it to the SPA via redirect |
| 3 | SPA sends a request to the Resource Server with the `access_token` as a Bearer token |
| 4 | Resource Server calls Keycloak's introspection endpoint to validate the token |
| 5 | Keycloak responds with token metadata; the Resource Server allows or denies the request |

---

## Tech Stack
 
| Layer | Technology |
|-------|-----------|
| Identity Provider | Keycloak 24.x |
| Backend | Java 21 · Spring Boot 3.x · Spring Security OAuth2 |
| Frontend | Angular 18 · keycloak-angular |
| Infrastructure | Docker · Docker Compose · PostgreSQL |
 
---

## Getting Started
 
### Prerequisites
 
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Java 21+ (for local backend development)
- Node.js 20+ (for local frontend development)

### 1. Clone the repository
 
```bash
git clone https://github.com/gustavo-as/sso-keycloak-poc.git
cd sso-keycloak-poc
```
 
### 2. Start the infrastructure
 
```bash
docker compose -f infra/docker-compose.yml up -d
```
 
This starts:
- **Keycloak** at `http://localhost:8080` (admin / admin)
- **PostgreSQL** at `localhost:5432`
Keycloak is pre-configured via `infra/keycloak/realm-export.json` — the realm, clients, and roles are imported automatically on first boot.
 
### 3. Start the backend
 
```bash
cd backend
./mvnw spring-boot:run
```
 
The API will be available at `http://localhost:8081`.
 
### 4. Start the frontend
 
```bash
cd frontend
npm install
ng serve
```
 
The SPA will be available at `http://localhost:4200`.
 
### 5. Log in
 
Open `http://localhost:4200` in your browser. You will be redirected to Keycloak. Use the test credentials:
 
| Username | Password | Role |
|----------|----------|------|
| `user@poc.dev` | `password` | `ROLE_USER` |
| `admin@poc.dev` | `password` | `ROLE_ADMIN` |
 
---
 
## Project Structure
 
```
sso-keycloak-poc/
│
├── backend/                      # Spring Boot — Resource Server
│   ├── src/
│   │   └── main/java/dev/poc/sso/
│   │       ├── controller/       # PeopleController
│   │       ├── config/           # SecurityConfig (OAuth2 + CORS + introspection)
│   │       └── model/            # Person record
│   └── pom.xml
│
├── frontend/                     # Angular SPA — Authorization Code + PKCE
│   ├── src/
│   │   ├── app/
│   │   │   ├── guards/           # authGuard (redirects to Keycloak if not logged in)
│   │   │   ├── interceptors/     # authInterceptor (attaches Bearer token)
│   │   │   ├── pages/people/     # PeopleComponent (protected page)
│   │   │   ├── app.config.ts     # Keycloak init + providers
│   │   │   └── app.routes.ts     # Routes with authGuard
│   │   └── keycloak.config.ts    # Keycloak connection settings
│   └── package.json
│
├── infra/
│   ├── docker-compose.yml        # Keycloak + PostgreSQL
│   └── keycloak/
│       └── realm-export.json     # Pre-configured realm (auto-imported)
│
├── docs/
│   └── architecture.png          # Architecture diagram
│
├── .gitignore
└── README.md
```
 
---
 
## API Endpoints
 
| Method | Path | Auth required | Description |
|--------|------|:---:|-------------|
| `GET` | `/people` | ✅ | Returns a list of people (protected resource) |
| `GET` | `/actuator/health` | ❌ | Health check |
 
### Example request
 
```bash
# Get token from Keycloak
TOKEN=$(curl -s -X POST http://localhost:8080/realms/sso-keycloak-poc/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=angular-client" \
  -d "grant_type=password" \
  -d "username=user@poc.dev" \
  -d "password=password" \
  | jq -r '.access_token')
 
# Call the protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/people
```
 
---
 
## Article
 
This project accompanies a full step-by-step article published as part of my portfolio:
 
> **SSO in Practice: building centralized authentication with Keycloak, Spring Boot, and Angular**
> *(link coming soon)*
 
The article covers every decision made here — from protocol selection to production considerations.
 
---
 
## Roadmap
 
- [x] Keycloak setup with Docker Compose and realm import
- [x] Spring Boot Resource Server with token introspection
- [x] Angular SPA with Authorization Code + PKCE
- [x] Refresh token rotation
- [x] Logout with Keycloak session invalidation
- [x] Role-based access control (RBAC) — frontend and backend
- [ ] HTTPS — out of scope for this POC (recommended for production with a valid certificate)

---
 
## License
 
This project is licensed under the [MIT License](LICENSE).
 
---
 
<div align="center">
  Built as a learning project and portfolio piece · Feedback welcome via <a href="https://github.com/your-username/sso-keycloak-poc/issues">Issues</a>
</div>
