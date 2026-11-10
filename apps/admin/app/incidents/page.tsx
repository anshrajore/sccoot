import { color } from "@scoot/design-system";

export default function Incidents() {
  return (
    <div>
      <h1>Incidents</h1>
      <article style={{ background: color.surface, borderRadius: 24, padding: 20 }}>
        <strong>No open SOS in the seed set</strong>
        <p>Assigned reviewers only. No bulk PII export from this console.</p>
      </article>
    </div>
  );
}
