/**
 * The docs' sections, in page order. The sidebar and the page both map over
 * this list, so an anchor cannot exist on one side only.
 */

export type Group = "Getting started" | "API" | "Reference";

export type Section = { id: string; group: Group; title: string };

export const SECTIONS: Section[] = [
  { id: "install", group: "Getting started", title: "Install" },
  { id: "quick-start", group: "Getting started", title: "Quick start" },
  { id: "options", group: "Getting started", title: "Options" },
  { id: "react", group: "API", title: "React" },
  { id: "vanilla", group: "API", title: "Vanilla" },
  { id: "cdn", group: "API", title: "CDN" },
  { id: "figures", group: "Reference", title: "Figures" },
  { id: "theme", group: "Reference", title: "Theme" },
  { id: "accessibility", group: "Reference", title: "Accessibility" },
];
