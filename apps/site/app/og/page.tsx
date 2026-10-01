import type { Metadata } from "next";
import { Tile } from "@/components/tile";
import { FIGURES } from "@/lib/figures";

/** The Open Graph card, as a page: scripts/og.mjs photographs it at 1200 × 630 into public/og.png. */
export const metadata: Metadata = { robots: { index: false } };

export default function Og() {
  return (
    <main className="flex h-[630px] w-[1200px] items-center gap-14 overflow-hidden px-16">
      <div className="w-[300px] shrink-0">
        <h1 className="text-[56px] font-medium leading-none tracking-[-0.04em]">hairline</h1>
        <p className="mt-5 text-[22px] leading-[1.35] text-muted">Six isometric line figures that answer the pointer.</p>
        <p className="mt-8 font-mono text-[15px] text-ink">npm i @lucasmarkes/hairline</p>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-4">
        {FIGURES.map((doc, i) => <Tile key={doc.id} id={doc.id} index={i + 1} name={doc.name} />)}
      </div>
    </main>
  );
}
