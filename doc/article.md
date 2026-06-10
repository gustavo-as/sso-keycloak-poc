### SSO in Practice: building centralized authentication with Keycloak, Spring Boot, and Angular

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




> All source code is available at [github.com/gustavo-as/sso-keycloak-poc](https://github.com/gustavo-as/sso-keycloak-poc)