"use client";

import { useState } from "react";
import { color } from "@scoot/design-system";

export default function Jurisdictions() {
  const [status, setStatus] = useState("DIRECTORY_ONLY");
  return (
    <div>
      <h1>Jurisdiction kill switch</h1>
      <p>Maharashtra Pune corridor. LIVE requires authority reference. Suspension keeps active-trip safety on.</p>
      <div style={{ background: color.surface, borderRadius: 24, padding: 20 }}>
        <p>Current: {status}</p>
        <p>Authority: MVR-0821/C.R.95/Tra-2</p>
        <button type="button" onClick={() => setStatus("SUSPENDED")}>
          Suspend matching
        </button>
        <button type="button" onClick={() => setStatus("DIRECTORY_ONLY")}>
          Directory only
        </button>
      </div>
    </div>
  );
}
