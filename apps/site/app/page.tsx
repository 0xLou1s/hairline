import type { CSSProperties } from "react";
import { Footer, GitHub, Topbar } from "@/components/chrome";
import { Inspector } from "@/components/inspector";
import { Install } from "@/components/install";
import { LINKS } from "@/lib/figures";
import { install } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;

/** Where a block falls in the hero's stagger. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * The home: the pitch, then one figure to play with. A Server Component, so
 * the figure is the package's React component rendered from here, and every
 * deploy runs it through server rendering and hydration. The rest lives on
 * /docs.
 */
export default function Page() {
  return (
    <>
      <Topbar />
      <main className="mx-auto grid max-w-[1080px] gap-10 px-[clamp(18px,5vw,28px)] pb-24 pt-16 md:gap-12 md:pt-24 [&>*]:min-w-0">
        <section aria-labelledby="hairline" className="hero-rise grid grid-cols-[minmax(0,1fr)] justify-items-center text-center">
          <h1 id="hairline" className="hero-title" style={at(0)}>
            Line drawings that <em>answer</em> the pointer.
          </h1>
          <p className="hero-sub" style={at(1)}>Six isometric figures for the web. SVG, no dependencies, React or plain DOM.</p>
          <div className="hero-install" style={at(2)}><Install commands={install(SITE)} /></div>
          <div className="hero-actions" style={at(3)}>
            <a className="btn btn-primary press" href="/docs">Get started</a>
            <a className="btn press" href={LINKS.github}><GitHub /> GitHub</a>
          </div>
          {/* a quiet line, not a third button: the two above stay the way in */}
          <p className="mt-5 text-[14px] text-muted" style={at(4)}>
            <a className="hover:text-ink" href="/skill">Or make your own with the skill →</a>
          </p>
        </section>

        <section id="try" aria-label="Try it" className="scroll-mt-[calc(var(--topbar)+24px)]">
          <Inspector />
        </section>
      </main>
      <Footer />
    </>
  );
}
