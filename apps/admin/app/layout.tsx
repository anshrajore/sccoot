import type { ReactNode } from "react";
import { color } from "@scoot/design-system";

export const metadata = { title: "Scoot operations" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
          background: color.canvas,
          color: color.ink,
        }}
      >
        <nav
          style={{
            display: "flex",
            gap: 16,
            padding: 20,
            background: color.ink,
            color: color.inverse,
          }}
        >
          <a href="/" style={{ color: "white" }}>
            Queue
          </a>
          <a href="/jurisdictions" style={{ color: "white" }}>
            Jurisdictions
          </a>
          <a href="/incidents" style={{ color: "white" }}>
            Incidents
          </a>
          <a href="/preview" style={{ color: "white" }}>
            Side-by-side
          </a>
        </nav>
        <main style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}
