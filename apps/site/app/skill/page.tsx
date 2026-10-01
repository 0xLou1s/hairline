import type { Metadata } from "next";
import { Footer, Topbar } from "@/components/chrome";
import { Command } from "@/components/command";
import { ExampleFrame } from "@/components/example-frame";
import { LINKS } from "@/lib/figures";
import { COMMAND, FOLDER, INSTALL, STEPS, SUMMARY, USE, examples } from "@/lib/skill";

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
        <header>
          <h1 className="max-w-[16ch] text-[36px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[44px]">Make your own figure</h1>
          <p className="mt-4 max-w-[64ch] text-[16px] leading-[1.55] text-muted">{SUMMARY}</p>
          <div className="skill-install"><Command code={INSTALL} kind="install" label="Copy install command" /></div>
        </header>

        <section aria-labelledby="examples-title" className="doc-section">
          <h2 id="examples-title" className="doc-h2">What it draws</h2>
          <p className="doc-p">Each figure below is the page the skill wrote for the line beside it, as it wrote it. Move the pointer over one.</p>
          <div>
            {shown.map((e) => (
              <article key={e.file} className="example" data-example={e.name}>
                <div className="example-prompt">
                  <Command code={e.prompt} kind="prompt" label="Copy prompt" />
                  <a className="doc-more" href={e.href}>Open the page</a>
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
          {USE.map((line) => <p key={line} className="doc-p">{line}</p>)}
          <p className="doc-note">
            The six figures and their options are in <a className="doc-more" href="/docs">the docs</a>. The skill&rsquo;s files are in <a className="doc-more" href={`${LINKS.github}/tree/main/skills/hairline-create`}>its folder on GitHub</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
