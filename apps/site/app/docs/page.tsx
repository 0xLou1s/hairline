import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { Footer, Topbar } from "@/components/chrome";
import { Install } from "@/components/install";
import { Tabs } from "@/components/tabs";
import { CARDS, FIGURES, OPTIONS } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { tiny } from "@/lib/size";
import { PASTE, install } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const SMALL = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

export const metadata: Metadata = { title: "Docs · hairline", alternates: { canonical: "/docs" } };

function Heading({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-10 max-w-[56ch]">
      <h2 id={id} className="scroll-mt-20 text-[30px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[36px]">{title}</h2>
      {children ? <p className="mt-3 text-[16px] leading-[1.55] text-muted">{children}</p> : null}
    </header>
  );
}

/**
 * The docs: install and paste, the options, and every figure small. A Server
 * Component, so each figure on it goes through server rendering and
 * hydration on every deploy, as on the home.
 */
export default async function Docs() {
  const commands = install(SITE);
  const paste = await Promise.all(PASTE.map(async (p) => ({ label: p.label, html: await highlight(p.code, p.lang) })));
  const size = tiny();

  return (
    <>
      <Topbar />
      <main className="mx-auto grid max-w-[1080px] gap-32 px-[clamp(18px,5vw,28px)] pb-24 pt-16 md:pt-24 [&>*]:min-w-0">
        <section aria-labelledby="quickstart">
          <h1 id="quickstart" className="mb-10 scroll-mt-20 text-[36px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[44px]">Get started</h1>
          <ol className="grid gap-12">
            <li className="step">
              <h2 className="step-title"><span className="step-n">1</span>Install</h2>
              <div className="max-w-[460px]"><Install commands={commands} /></div>
            </li>
            <li className="step">
              <h2 className="step-title"><span className="step-n">2</span>Paste</h2>
              <p className="mb-4 max-w-[60ch] text-[14px] leading-[1.55] text-muted">
                A figure fills its parent&rsquo;s width at a 5:4 aspect ratio. The React entry is a client module, so a Server Component can render it as it is.
              </p>
              <Tabs tabs={paste} label="Paste" />
            </li>
          </ol>
          <div className="mt-14 overflow-x-auto">
            <table className="props" data-options>
              <thead>
                <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does</th></tr>
              </thead>
              <tbody>
                {OPTIONS.map((row) => (
                  <tr key={row.name}><td>{row.name}</td><td>{row.type}</td><td>{row.default}</td><td>{row.description}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="figures">
          <Heading id="figures" title="One prop, six figures">
            Every figure takes <code className="font-mono text-[14px] text-ink">intensity</code>, from 0 to 1. Here is what it turns up.
          </Heading>
          <ul className="grid">
            {FIGURES.map((doc) => {
              const Small = SMALL[doc.id];
              return (
                <li key={doc.id} className="figure-row" data-row={doc.id}>
                  <div>
                    <h3 className="text-[20px] font-medium leading-none tracking-[-0.02em]">{doc.name}</h3>
                    <p className="mt-3 text-[16px] leading-[1.5]">{doc.stronger}</p>
                    <p className="mt-1 max-w-[52ch] text-[14px] leading-[1.55] text-muted">{doc.summary}</p>
                  </div>
                  <div className="tile w-full max-w-[240px] justify-self-end"><Small /></div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Why" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => (
            <div key={card.title} className="card" data-card={card.title}>
              <h3 className="text-[15px] font-medium">{card.title}</h3>
              {card.title === "Tiny" ? <p className="mt-3 text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums" data-size>{size}</p> : null}
              <p className="mt-2 text-[14px] leading-[1.5] text-muted">{card.body}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
