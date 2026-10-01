import type { Metadata } from "next";
import { Terrain } from "@lucasmarkes/hairline/react";

/** The Open Graph card, as a page: scripts/og.mjs photographs it at 1200 × 630 into public/og.png. */
export const metadata: Metadata = { robots: { index: false } };

export default function Og() {
  return (
    <main className="flex h-[630px] w-[1200px] items-center gap-16 overflow-hidden px-20">
      <div className="w-[470px] shrink-0">
        <h1 className="text-[64px] font-medium leading-[1.02] tracking-[-0.045em]">
          Line drawings that <em className="font-serif text-[1.08em] font-normal tracking-[-0.02em]">answer</em> the pointer.
        </h1>
        <p className="mt-8 font-mono text-[18px] text-muted">npm i @lucasmarkes/hairline</p>
      </div>
      <div className="tile flex-1 p-6"><Terrain /></div>
    </main>
  );
}
