import type { Metadata } from "next";
import { Footer, Topbar } from "@/components/chrome";
import { Sidebar } from "@/components/sidebar";
import { LINKS } from "@/lib/figures";
import { highlight } from "@/lib/highlight";
import { tiny } from "@/lib/size";
import { CDN, CSS, QUICKSTART, REACT, REACT_SIGNATURE, VANILLA, VANILLA_SIGNATURE, install } from "@/lib/snippets";
import { Api, GettingStarted, Reference } from "./sections";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;

export const metadata: Metadata = { title: "Docs · hairline", alternates: { canonical: "/docs" } };

/**
 * The docs: one page of sections. A Server Component, so every snippet is
 * highlighted at build and each figure goes through server rendering and
 * hydration on every deploy, as on the home.
 */
export default async function Docs() {
  const [quickstart, reactSignature, react, vanillaSignature, vanilla, cdn, css] = await Promise.all([
    Promise.all(QUICKSTART.map(async (q) => ({ label: q.label, file: q.file, html: await highlight(q.code, q.lang) }))),
    highlight(REACT_SIGNATURE, "tsx"),
    highlight(REACT, "tsx"),
    highlight(VANILLA_SIGNATURE, "ts"),
    highlight(VANILLA, "ts"),
    highlight(CDN, "html"),
    highlight(CSS, "css"),
  ]);

  return (
    <>
      <Topbar />
      <div className="docs">
        <Sidebar />
        <main className="docs-main">
          <header className="max-w-[64ch]">
            <h1 className="text-[36px] font-medium leading-[1.05] tracking-[-0.035em] text-balance md:text-[44px]">Six figures, one set of options.</h1>
            <p className="mt-4 text-[16px] leading-[1.55] text-muted">
              Every figure takes the same four options and draws itself in SVG, with no dependencies. Install the package, paste a figure, and turn <code className="doc-code">intensity</code> up or down.
            </p>
          </header>
          <GettingStarted commands={install(SITE)} size={tiny()} quickstart={quickstart} />
          <Api code={{ reactSignature, react, vanillaSignature, vanilla, cdn }} />
          <Reference css={css} />
          <p className="doc-note">
            Anything missing? <a className="doc-more" href={`${LINKS.github}/issues`}>Open an issue on GitHub</a>.
          </p>
        </main>
      </div>
      <Footer />
    </>
  );
}
