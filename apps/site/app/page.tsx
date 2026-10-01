import { Exploded, Phosphor, Riffle, Slow, Terrain, Turntable } from "@lucasmarkes/hairline/react";
import { FigureDemo } from "@/components/figure-demo";
import { Tabs } from "@/components/tabs";
import { ThemeEditor } from "@/components/theme-editor";
import { CARDS, FIGURES, LINKS, NOTES, SHARED, THEME, rows, type Row } from "@/lib/figures";
import { LIVE, highlight, plain } from "@/lib/highlight";
import { FRAMEWORKS, install, react, vanilla } from "@/lib/snippets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;

function Props({ list }: { list: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="props">
        <thead>
          <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does</th></tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.name}><td>{row.name}</td><td>{row.type}</td><td>{row.default}</td><td>{row.description}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 max-w-[62ch]">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{kicker}</p>
      <h2 id={id} className="mt-2 scroll-mt-10 text-[28px] font-medium tracking-[-0.03em]">
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children ? <p className="mt-3 text-[16px] leading-[1.55] text-muted">{children}</p> : null}
    </header>
  );
}

/**
 * The whole site. A Server Component: the six figures in the hero are the
 * package's React components rendered straight from here, so every deploy
 * runs them through server rendering and hydration.
 */
export default async function Page() {
  const demos = await Promise.all(
    FIGURES.map(async (doc) => [
      { label: "React", html: await highlight(react(doc, LIVE), "tsx", doc.range.default) },
      { label: "Vanilla", html: await highlight(vanilla(doc, LIVE), "ts", doc.range.default) },
    ]),
  );
  const frameworks = await Promise.all(FRAMEWORKS.map(async (f) => ({ label: f.label, html: await highlight(f.code, f.lang) })));
  const commands = install(SITE).map((i) => ({ label: i.label, html: plain(i.code) }));
  const hero = [
    <Riffle key="riffle" labels={CARDS} />, <Terrain key="terrain" />, <Exploded key="exploded" />,
    <Phosphor key="phosphor" />, <Slow key="slow" />, <Turntable key="turntable" />,
  ];

  return (
    <main className="mx-auto grid max-w-[1040px] gap-28 px-6 pb-24 pt-20 [&>*]:min-w-0">
      <section aria-labelledby="hairline">
        <div className="max-w-[52ch]">
          <h1 id="hairline" className="text-[44px] font-medium leading-none tracking-[-0.04em]">hairline</h1>
          <p className="mt-4 text-[19px] leading-[1.45] text-muted">
            Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3" data-hero>
          {FIGURES.map((doc, i) => (
            <a key={doc.id} href={`#${doc.id}`} className="tile" aria-label={`${doc.name}, figure ${i + 1}`}>
              {hero[i]}
              <span className="cap left-4 top-3">Fig. {i + 1}</span>
              <span className="cap right-4 top-3">{doc.name}</span>
            </a>
          ))}
        </div>
        <div className="mt-8 max-w-[560px]" data-install>
          <Tabs tabs={commands} label="Install" />
        </div>
      </section>

      {FIGURES.map((doc, i) => (
        <section key={doc.id} aria-labelledby={doc.id} data-section={doc.id}>
          <Heading id={doc.id} kicker={`Fig. ${i + 1}`} title={doc.name}>{doc.summary}</Heading>
          <FigureDemo id={doc.id} index={i + 1} name={doc.name} option={doc.option} range={doc.range} tabs={demos[i]} />
          <div className="mt-8"><Props list={rows(doc)} /></div>
        </section>
      ))}

      <section aria-labelledby="options">
        <Heading id="options" kicker="API" title="Options every figure takes">
          A figure fills the width of its element at a 5:4 aspect ratio. In React, every other prop goes to the <code className="font-mono text-[14px]">&lt;div&gt;</code>, and the ref is forwarded.
        </Heading>
        <Props list={SHARED} />
      </section>

      <section aria-labelledby="theme">
        <Heading id="theme" kicker="Theme" title="Six properties">
          Set them on a figure or on anything above it. Without them a figure is light, or dark when the page says so. The plate colour hides what is drawn behind each plate, so it has to match what the figure sits on.
        </Heading>
        <ThemeEditor />
        <ul className="mt-8 grid gap-2 text-[14px] leading-[1.5]">
          {THEME.map((t) => (
            <li key={t.property} className="grid gap-x-6 md:grid-cols-[190px_1fr]">
              <code className="font-mono text-[13px]">{t.property}</code>
              <span className="text-muted">{t.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="frameworks">
        <Heading id="frameworks" kicker="Use" title="Anywhere there is an element">
          The vanilla entry is a function that takes an element and returns <code className="font-mono text-[14px]">update</code> and <code className="font-mono text-[14px]">destroy</code>, which is all a framework needs.
        </Heading>
        <Tabs tabs={frameworks} label="Frameworks" />
      </section>

      <section aria-labelledby="notes">
        <Heading id="notes" kicker="Notes" title="What it does when you are not looking" />
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {NOTES.map((n) => (
            <div key={n.title}>
              <dt className="text-[15px] font-medium">{n.title}</dt>
              <dd className="mt-1 text-[14px] leading-[1.55] text-muted">{n.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-6 font-mono text-[12px] text-muted">
        <a className="text-ink" href={LINKS.github}>GitHub</a>
        <a className="text-ink" href={LINKS.npm}>npm</a>
        <a className="text-ink" href={LINKS.essay}>The essay</a>
        <a className="text-ink" href="/llms.txt">llms.txt</a>
        <span className="md:ml-auto">
          After the figures on <a className="text-ink" href={LINKS.linear}>Linear</a>’s home page. MIT, Lucas Marques.
        </span>
      </footer>
    </main>
  );
}
