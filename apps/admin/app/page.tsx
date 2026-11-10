"use client";

import { useState } from "react";
import { color } from "@scoot/design-system";

const seed = [
  { id: "v1", subject: "Student ID • Aditi", type: "STUDENT", status: "PENDING" },
  { id: "v2", subject: "RC + insurance • Rohan", type: "VEHICLE", status: "PENDING" },
];

export default function VerificationQueue() {
  const [cases, setCases] = useState(seed);
  return (
    <div>
      <h1>Verification workbench</h1>
      <p>Reviewers see assigned documents only. Decisions are audited.</p>
      {cases.map((c) => (
        <article
          key={c.id}
          style={{
            background: color.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <strong>{c.subject}</strong>
          <div>
            {c.type} · {c.status}
          </div>
          <button
            type="button"
            onClick={() => setCases((rows) => rows.map((r) => (r.id === c.id ? { ...r, status: "APPROVED" } : r)))}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => {
              const reason = window.prompt("Reason code", "DOC_UNREADABLE") ?? "REJECTED";
              setCases((rows) => rows.map((r) => (r.id === c.id ? { ...r, status: `REJECTED:${reason}` } : r)));
            }}
          >
            Reject with reason
          </button>
        </article>
      ))}
    </div>
  );
}
