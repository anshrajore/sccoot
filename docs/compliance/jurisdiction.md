# Jurisdiction control

Activation states: `DIRECTORY_ONLY`, `WAITLIST`, `APPROVED_PILOT`, `LIVE`, `SUSPENDED`.

Missing, expired, or contradictory policy → fail closed (no new matches or bookings). Active trip safety workflows remain available after suspend.

Do not hardcode “Maharashtra = 25%” in the mobile app. Caps live in versioned `jurisdiction_policies`.
