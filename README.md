# Scoot

Student-first recurring commute and private carpooling. Passengers match onto a driver-user’s pre-existing private car journey. The driver origin and destination are not passenger-dispatched.

This monorepo follows the Product & Engineering Blueprint v1.0 and the Stitch campus-commute visual system.

## Apps and packages

- `apps/mobile` — Expo Router (iOS + Android development builds)
- `apps/admin` — Next.js operations console
- `packages/domain` — roles, trip/booking states, jurisdiction types
- `packages/matching` — hard filters + explainable ranking
- `packages/pricing` — segment allocation + legal cap evaluator
- `packages/validation` — Zod request schemas
- `packages/api-client` — versioned `/v1` client
- `packages/design-system` — Stitch tokens and UI primitives
- `supabase/` — migrations, RLS, Edge Function command API

## Non-negotiables

- A commute template is not bookable. A dated trip occurrence is.
- Raw segment allocation and permitted contribution are separate fields.
- Clients never write booking, quote, payment, or trip status.
- Missing or expired jurisdiction policy fails closed.
- Private car only in v1 (no bike taxi, no wallet, no surge).

## Local development

```bash
pnpm install
pnpm test
pnpm typecheck
```

Supabase: `supabase start` then apply `supabase/migrations`. Copy `.env.example` to `.env`. Builds fail if required public env vars are missing.

Live Maharashtra activation stays off until counsel sign-off. Policy adapter tests still run.

## Design

Stitch HTML/screens live in `docs/design/stitch/` as visual reference, not production markup.
