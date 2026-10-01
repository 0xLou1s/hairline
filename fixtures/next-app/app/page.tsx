import { Riffle, Slow } from "@lucasmarkes/hairline/react";
import { Vanilla } from "./vanilla";

/**
 * A Server Component: no "use client" here. The components come from the
 * React entry, which marks itself as a client module; the third figure comes
 * from the vanilla entry, so the page loads both entries at once.
 */
export default function Page() {
  return (
    <main style={{ display: "grid", gap: 24, width: 400, margin: "40px auto" }}>
      <Riffle id="riffle" labels={["Radial menu", "Drum"]} />
      <Slow id="slow" rate={0.4} theme="dark" />
      <Vanilla />
    </main>
  );
}
