# ADR-001 Modular monolith

Status: accepted

Scoot ships as one deployable backend (Supabase + Edge Functions) with domain modules in TypeScript packages. Identity, commute, matching, pricing, booking, trip, safety, and finance are code boundaries, not services.

Clients: Expo mobile and Next.js admin. PostgreSQL is the system of record. Map and PSP SDKs stay behind adapters.
