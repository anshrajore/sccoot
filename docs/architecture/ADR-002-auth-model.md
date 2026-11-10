# ADR-002 Auth model

Status: accepted

Authentication is Supabase Auth (phone/email OTP). Authorization uses server-controlled `profiles` and role tables, never editable `user_metadata`.

The mobile and admin apps use the publishable anon key with RLS. `service_role` exists only in Edge Functions and CI. Reviewer access is assignment-scoped.
