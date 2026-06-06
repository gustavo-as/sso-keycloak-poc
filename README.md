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

