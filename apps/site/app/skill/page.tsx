import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Anchor } from "@/components/anchor";
import { Footer, Topbar } from "@/components/chrome";
import { Command } from "@/components/command";
import { ExampleFrame } from "@/components/example-frame";
import { Rail } from "@/components/rail";
import { LINKS } from "@/lib/figures";
import { COMMAND, FOLDER, INSTALL, STEPS, SUMMARY, USE, examples } from "@/lib/skill";

/** The file the skill writes, set as code where a line names it. USE stays plain text for llms.txt. */
const FILE = "hairline-<name>.html";
const named = (line: string) => {
  const i = line.indexOf(FILE);
  if (i < 0) return line;
  return <>{line.slice(0, i)}<code className="doc-code">{FILE}</code>{line.slice(i + FILE.length)}</>;
};

/** A block's place in the header's entrance. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export const metadata: Metadata = { title: "Make your own figure · hairline", description: SUMMARY, alternates: { canonical: "/skill" } };

const RAIL = [
  {
    title: "hairline-create",
    icon: "sparkle" as const,
    color: "#8b5cf6",
    items: [
      { id: "install", title: "Install" },
      { id: "use", title: "How to use it" },
      { id: "how", title: "How it works" },
      { id: "examples", title: "What it draws" },
    ],
  },
];

/** A section in the column: its title beside a button that copies its link. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="doc-section">
      <div className="doc-head">
        <h2 id={`${id}-title`} className="doc-h2">{title}</h2>
        <Anchor id={id} title={title} />
      </div>
      {children}
    </section>
  );
}

/**
 * The skill's page, as a catalogue: how to get it and use it, then each idea it has drawn, on a card with the line
 * that asked for it and the page it wrote, in a frame. A Server Component: it reads each example's name and meaning
 * from that page.
 */
export default function Skill() {
  const shown = examples();
  return (
    <>
      <Topbar />
      <Rail label="Skill" groups={RAIL} />
      <main className="col skill">
        {/* the home's hero sends people here, and the header arrives as the hero does */}
        <header className="hero-rise">
          <p className="col-label" style={at(0)}>Skill</p>
          <h1 className="col-h1" style={at(1)}>Make your own figure</h1>
          <p className="col-lede" style={at(2)}>{SUMMARY}</p>
        </header>

        <Section id="install" title="Install">
          <Command code={INSTALL} kind="install" label="Copy install command" />
          <p className="doc-p">{FOLDER}</p>
        </Section>

        <Section id="use" title="How to use it">
          <Command code={`${COMMAND} <idea>`} kind="usage" label="Copy command" />
          <ul role="list" className="doc-list">
            {USE.map((line) => <li key={line}>{named(line)}</li>)}
          </ul>
        </Section>

        <Section id="how" title="How it works">
          <ol className="howto" data-steps>
            {STEPS.map((s) => (
              <li key={s.title}><span><b>{s.title}.</b> {s.text}</span></li>
            ))}
          </ol>
        </Section>

        <Section id="examples" title="What it draws">
          <p className="doc-p">Four ideas, four files. Each one opens from disk with no dependencies. Move the pointer over one.</p>
          {shown.map((e) => (
            <article key={e.file} className="card ex" data-example={e.name} aria-label={e.prompt}>
              <div className="ex-h">
                <Command code={e.prompt} kind="prompt" label={`Copy prompt: ${e.idea}`} />
                <a className="ex-open" href={e.href} target="_blank" rel="noreferrer" aria-label={`Open ${e.file} in a new tab`} title="Open the file">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 3.75H4.25a1.5 1.5 0 0 0-1.5 1.5v6.5a1.5 1.5 0 0 0 1.5 1.5h6.5a1.5 1.5 0 0 0 1.5-1.5V10M9 2.75h4.25V7M13 3 7.5 8.5" />
                  </svg>
                </a>
              </div>
              <div className="ex-b">
                <p className="ex-name">{e.name}</p>
                <p className="ex-means">{e.means}</p>
                {e.followUp && (
                  <div className="ex-fu">
                    <p className="ex-then">Then asked</p>
                    <Command code={e.followUp} kind="follow-up" label={`Copy follow-up: ${e.idea}`} />
                  </div>
                )}
              </div>
              <div className="ex-f example-figure">
                <ExampleFrame src={`${e.href}?theme=light`} title={e.means} />
              </div>
            </article>
          ))}
        </Section>

        <p className="col-end">
          The six figures and their options are in <a className="doc-more" href="/docs">the docs</a>. The skill&rsquo;s files are in <a className="doc-more" href={`${LINKS.github}/tree/main/skills/hairline-create`}>its folder on GitHub</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
