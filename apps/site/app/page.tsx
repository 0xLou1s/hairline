import pkg from "@lucasmarkes/hairline/package.json";
import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { CopyButton } from "@/components/copy";
import { Inspector } from "@/components/inspector";
import { Install } from "@/components/install";
import { Tabs } from "@/components/tabs";
import { CARDS, FIGURES, LINKS, OPTIONS } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { tiny } from "@/lib/size";
import { PASTE, install } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const SMALL = { riffle: Riffle, terrain: Terrain, exploded: Exploded, phosphor: Phosphor, slow: Slow, turntable: Turntable };

function GitHub() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function Heading({ id, title, children }: { id: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-[56ch]">
      <h2 id={id} className="scroll-mt-20 text-[30px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[36px]">{title}</h2>
      {children ? <p className="mt-3 text-[16px] leading-[1.55] text-muted">{children}</p> : null}
    </header>
  );
}

/**
 * The whole site. A Server Component: every figure on it is the package's
 * React component rendered from here, so every deploy runs them through
 * server rendering and hydration.
 */
export default async function Page() {
  const commands = install(SITE);
  const paste = await Promise.all(PASTE.map(async (p) => ({ label: p.label, html: await highlight(p.code, p.lang) })));
  const size = tiny();

  return (
    <>
      <header className="topbar">
        <a href="#top" className="text-[15px] font-medium tracking-[-0.02em]">hairline</a>
        <nav className="flex items-center gap-1">
          <span className="px-2 font-mono text-[12px] text-muted" data-version>v{pkg.version}</span>
          <a className="icon-link" href={LINKS.github} aria-label="GitHub"><GitHub /></a>
          <CopyButton text={`${SITE}/llms.txt`} open="/llms.txt" label="llms.txt" className="btn btn-quiet" />
        </nav>
      </header>

      <main id="top" className="mx-auto grid max-w-[1080px] gap-32 px-[clamp(18px,5vw,28px)] pb-24 pt-16 md:pt-24 [&>*]:min-w-0">
        <section aria-labelledby="hairline" className="grid grid-cols-[minmax(0,1fr)] justify-items-center text-center">
          <h1 id="hairline" className="max-w-[16ch] text-[44px] font-medium leading-[1.02] tracking-[-0.045em] md:text-[64px]">
            Line drawings that <em className="font-serif text-[1.08em] font-normal tracking-[-0.02em]">answer</em> the pointer.
          </h1>
          <p className="mt-5 max-w-[44ch] text-[18px] leading-[1.5] text-muted">
            Six isometric figures for the web. SVG, no dependencies, React or plain DOM.
          </p>
          <div className="mt-9 w-full max-w-[460px]"><Install commands={commands} /></div>
          <div className="mt-5 flex gap-2">
            <a className="btn btn-primary" href="#quickstart">Get started</a>
            <a className="btn" href={LINKS.github}><GitHub /> GitHub</a>
          </div>
        </section>

        <section aria-label="Try it">
          <Inspector />
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
                    <h3 className="font-serif text-[30px] italic leading-none">{doc.name}</h3>
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
              {card.title === "Tiny" ? <p className="mt-3 font-serif text-[34px] leading-none" data-size>{size}</p> : null}
              <p className="mt-2 text-[14px] leading-[1.5] text-muted">{card.body}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="quickstart">
          <Heading id="quickstart" title={<>Two <em className="font-serif font-normal">steps</em></>} />
          <ol className="grid gap-12">
            <li className="step">
              <h3 className="step-title"><span className="step-n">1</span>Install</h3>
              <div className="max-w-[460px]"><Install commands={commands} /></div>
            </li>
            <li className="step">
              <h3 className="step-title"><span className="step-n">2</span>Paste</h3>
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

        <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-3 border-t border-line pt-8 text-[13px] text-muted">
          <p>
            MIT licensed. Built by Lucas Marques. After <a className="text-ink" href={LINKS.linear}>Linear</a>&rsquo;s figures.
          </p>
          <nav className="flex gap-5 md:ml-auto">
            <a className="text-ink" href={LINKS.npm}>npm</a>
            <a className="text-ink" href={LINKS.github}>GitHub</a>
            <a className="text-ink" href="/llms.txt">llms.txt</a>
            <a className="text-ink" href={LINKS.essay}>The essay</a>
          </nav>
        </footer>
      </main>
    </>
  );
}
