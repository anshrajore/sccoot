# ADR-003 Maps adapter

Status: accepted

Matching and UI never import Google or Mappls SDK types. `MapsProvider` exposes geocode, route, matrix, and waypoint insertion. P0 uses a stub/fixture router so tests run without vendor keys. Road distance, not haversine, is the ranking input once a live provider is wired.
