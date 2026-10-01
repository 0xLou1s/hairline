import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Footer, Topbar } from "@/components/chrome";
import { Command } from "@/components/command";
import { ExampleFrame } from "@/components/example-frame";
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

/**
 * The skill's page: what it draws first, then how to get it and use it. A
 * Server Component: it reads each example's name and meaning from the page
 * the skill wrote, and that page is shown as it is, in a frame.
 */
export default function Skill() {
  const shown = examples();
  return (
    <>
      <Topbar />
      <main className="skill">
        {/* the home's hero sends people here, and the header arrives as the hero does */}
        <header className="hero-rise">
          <h1 className="max-w-[16ch] text-[36px] font-medium leading-[1.05] tracking-[-0.035em] text-balance md:text-[44px]" style={at(0)}>Make your own figure</h1>
          <p className="mt-4 max-w-[64ch] text-[16px] leading-[1.55] text-muted" style={at(1)}>{SUMMARY}</p>
          <div className="skill-install" style={at(2)}><Command code={INSTALL} kind="install" label="Copy install command" /></div>
        </header>

        <section aria-labelledby="examples-title" className="doc-section">
          <h2 id="examples-title" className="doc-h2">What it draws</h2>
          <p className="doc-p">Each figure below is the page the skill wrote for the line next to it. Move the pointer over one.</p>
          <div>
            {shown.map((e) => (
              <article key={e.file} className="example" data-example={e.name} aria-label={e.prompt}>
                <div className="example-prompt">
                  {/* one exchange: the prompt, and the change asked for next */}
                  <div className="example-turns">
                    <Command code={e.prompt} kind="prompt" label={`Copy prompt: ${e.idea}`} />
                    {e.followUp && (
                      <>
                        <p className="example-then">then</p>
                        <Command code={e.followUp} kind="follow-up" label={`Copy follow-up: ${e.idea}`} />
                      </>
                    )}
                  </div>
                </div>
                <div className="example-figure">
                  <ExampleFrame src={`${e.href}?theme=light`} title={e.means} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-title" className="doc-section">
          <h2 id="how-title" className="doc-h2">How it works</h2>
          <ol className="skill-steps" data-steps>
            {STEPS.map((s) => (
              <li key={s.title}><span><strong>{s.title}.</strong> {s.text}</span></li>
            ))}
          </ol>
          <p className="doc-note">{FOLDER}</p>
        </section>

        <section aria-labelledby="use-title" className="doc-section">
          <h2 id="use-title" className="doc-h2">How to use it</h2>
          <div className="max-w-[460px]"><Command code={`${COMMAND} <idea>`} kind="usage" label="Copy command" /></div>
          {USE.map((line) => <p key={line} className="doc-p">{named(line)}</p>)}
          <p className="doc-note">
            The six figures and their options are in <a className="doc-more" href="/docs">the docs</a>. The skill&rsquo;s files are in <a className="doc-more" href={`${LINKS.github}/tree/main/skills/hairline-create`}>its folder on GitHub</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
