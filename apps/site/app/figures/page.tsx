import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Catalogue } from "@/components/catalogue";
import { Footer, Topbar } from "@/components/chrome";
import { tally } from "@/lib/catalogue";
import { FIGURES, LINKS, type FigureId } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { share } from "@/lib/share";
import { paste } from "@/lib/snippets";

/** A block's place in the header's entrance. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

const LEDE = `${tally()}, grouped by what they draw. Each answers the pointer and takes the same four options. Pick one to see it large and copy its code.`;

export const metadata: Metadata = share("/figures", "Figures", LEDE);

/**
 * /figures: every figure on its shelf. A Server Component, so each drawn figure's code is highlighted at build, three
 * ways, and the catalogue shows it in the drawer.
 */
export default async function Figures() {
  const code = Object.fromEntries(
    await Promise.all(
      FIGURES.map(async (f) => [f.id, await Promise.all(paste(f.name, f.id).map(async (q) => ({ label: q.label, file: q.file, html: await highlight(q.code, q.lang) })))] as const),
    ),
  ) as Record<FigureId, { label: string; file: string; html: string }[]>;

  return (
    <>
      <Topbar />
      <Catalogue
        code={code}
        header={
          <header className="hero-rise">
            <h1 className="col-h1" style={at(0)}>Every figure, by what it <em>draws</em>.</h1>
            <p className="col-lede" style={at(1)}>{LEDE}</p>
          </header>
        }
        end={
          <p className="col-end">
            Missing a figure, a variation, or a whole shelf? <a className="doc-more" href={`${LINKS.github}/issues`}>Ask for it on GitHub</a>. The ones most asked for are drawn first.
          </p>
        }
      />
      <Footer />
    </>
  );
}
