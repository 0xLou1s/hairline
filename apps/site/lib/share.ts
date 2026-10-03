import type { Metadata } from "next";
import { COUNT, LINKS } from "./figures";
import { cap } from "./words";

/** What a page says of itself where it has nothing closer to say. */
export const DESCRIPTION = `${cap(COUNT)} isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.`;

/** The pages a reader can land on, in the top bar's order: the sitemap lists these. /og is left out, a picture to photograph. */
export const PAGES = ["/", "/figures", "/docs", "/skill", "/inspo"] as const;

const NAME = "hairline";

/** The one picture every card shows: scripts/og.mjs photographs /og into public/og.png. */
const PICTURE = { url: "/og.png", width: 1200, height: 630, alt: "Line drawings that answer the pointer: the Exploded figure, its layers lifted apart, with the install commands." };

/**
 * A page's metadata, with the card a pasted link shows: Open Graph's tags and
 * X's. Next replaces `openGraph` and `twitter` whole instead of merging them,
 * so a page that sets neither shows the home's title and address under its own
 * link. Every page asks here, and each card names its own page.
 */
export function share(path: (typeof PAGES)[number], title = NAME, description = DESCRIPTION, type: "website" | "article" = "website"): Metadata {
  return {
    title: title === NAME ? NAME : `${title} · ${NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: NAME, type, images: [PICTURE] },
    twitter: { card: "summary_large_image", title, description, images: [PICTURE.url], creator: `@${LINKS.x.split("/").pop()}` },
  };
}
