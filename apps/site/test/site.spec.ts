import { expect, test, type Page } from "@playwright/test";

const IDS = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"];
const MANAGERS = [
  ["npm", "npm i @lucasmarkes/hairline"],
  ["pnpm", "pnpm add @lucasmarkes/hairline"],
  ["yarn", "yarn add @lucasmarkes/hairline"],
  ["bun", "bun add @lucasmarkes/hairline"],
  // the build's base URL, which is localhost:3000 off Vercel
  ["shadcn", "npx shadcn@latest add http://localhost:3000/r/hairline.json"],
] as const;

function watch(page: Page): string[] {
  const noise: string[] = [];
  page.on("console", (m) => {
    // Vercel Analytics' script exists only on Vercel
    if (m.location().url.includes("/_vercel/")) return;
    if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`pageerror: ${e}`));
  return noise;
}

/** The figure's drawing, without the ids that differ between mounts. */
const drawing = (page: Page) => page.locator("[data-inspector] [data-hairline] > svg").evaluate((svg) => svg.innerHTML.replace(/hl-fd\d+/g, ""));

test("the home prerenders an empty box, then draws the inspector's figure with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  // the figure's box is empty on the server
  expect(html.match(/<div style="aspect-ratio:5 \/ 4"><\/div>/g)).toHaveLength(1);
  expect(html).not.toMatch(/aspect-ratio:5 \/ 4"[^>]*><svg/);
  expect(html).not.toMatch(/Fig\. \d/);

  const noise = watch(page);
  await page.goto("/");
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(1);
  await expect(page.locator("[data-install]").first()).toHaveText(/npm i @lucasmarkes\/hairline/);
  await expect(page.locator("[data-version]")).toHaveText(/^v\d+\.\d+\.\d+/);
  expect(noise).toEqual([]);
});

test("the docs prerender six empty boxes, then draw one figure per row with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/docs")).text();
  expect(html.match(/<div style="aspect-ratio:5 \/ 4"><\/div>/g)).toHaveLength(6);
  expect(html).not.toMatch(/aspect-ratio:5 \/ 4"[^>]*><svg/);

  const noise = watch(page);
  await page.goto("/docs");
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(6);
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] [data-hairline] > svg > *`).first()).toBeAttached();
  await expect(page.locator("[data-size]")).toHaveText(/^\d+\.\d kB$/);
  expect(noise).toEqual([]);
});

test("the docs' code is in greys: every token's colour has equal red, green and blue", async ({ page }) => {
  await page.goto("/docs");
  const colours = await page.locator("main pre span").evaluateAll((spans) => spans.map((s) => getComputedStyle(s).color));
  expect(colours.length).toBeGreaterThan(10);
  const tinted = colours.filter((c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g)!.map(Number);
    return !(r === g && g === b);
  });
  expect(tinted).toEqual([]);
});

test("the inspector's figure picker picks the figure, and the snippet follows", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await expect(inspector.locator("[data-snippet] pre")).toContainText("<Terrain />");
  const figures = inspector.getByRole("radiogroup", { name: "Figure" });
  await figures.getByRole("radio", { name: "Riffle" }).click();
  await expect(figures.getByRole("radio", { name: "Riffle" })).toHaveAttribute("aria-checked", "true");
  await expect(inspector.locator("[data-figure]")).toHaveAttribute("data-figure", "riffle");
  await expect(inspector.locator("[data-hairline]")).toHaveCount(1);
  // the arrow keys walk the choice
  await figures.getByRole("radio", { name: "Riffle" }).press("ArrowRight");
  await expect(inspector.locator("[data-figure]")).toHaveAttribute("data-figure", "terrain");
  await expect(figures.getByRole("radio", { name: "Terrain" })).toBeFocused();
  await figures.getByRole("radio", { name: "Terrain" }).press("ArrowLeft");
  await expect(inspector.locator("[data-snippet] pre")).toContainText('import { Riffle } from "@lucasmarkes/hairline/react";');
  await expect(inspector.locator("[data-snippet] pre")).toContainText("<Riffle />");
});

test("the inspector's slider reaches the figure, and the snippet shows it", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  const slider = inspector.getByRole("slider", { name: "Intensity" });
  const stage = inspector.locator("[data-hairline]");
  // measured at each hover: the slider sits under the figure, and filling it can scroll the page
  const hover = async () => {
    await stage.scrollIntoViewIfNeeded();
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(1200);
  };

  await slider.fill("0");
  await expect(inspector.locator("output")).toHaveText("0.00");
  await expect(inspector.locator("[data-snippet] pre")).toContainText("<Terrain intensity={0} />");
  await hover();
  const subtle = await drawing(page);

  await slider.fill("1");
  await expect(inspector.locator("[data-snippet] pre")).toContainText("<Terrain intensity={1} />");
  await hover();
  expect(await drawing(page)).not.toBe(subtle);

  await slider.fill("0.5");
  await expect(inspector.locator("[data-snippet] pre")).toContainText("<Terrain />");
});

test("the inspector's theme switch repaints the figure", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await inspector.getByRole("radio", { name: "Dark" }).click();
  await expect(inspector.locator("[data-snippet] pre")).toContainText('<Terrain theme="dark" />');
  const plate = () => inspector.locator("[data-hairline] svg path").first().evaluate((el) => getComputedStyle(el).fill);
  await expect.poll(plate).toBe("rgb(8, 9, 10)");
  await inspector.getByRole("radio", { name: "Auto" }).click();
  await expect.poll(plate).toBe("rgb(255, 255, 255)");
});

test("the install pill copies every manager's command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  for (const [label, code] of MANAGERS) {
    await expect(pill).toHaveAttribute("data-install", label);
    await expect(pill.locator("code")).toHaveText(code);
    const copy = pill.getByRole("button", { name: "Copy install command" });
    await copy.click();
    await expect(copy).toHaveAttribute("data-copied", "true");
    await expect(pill.getByText("Copied")).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await pill.getByRole("button", { name: new RegExp(`\\(${label}\\): switch to`) }).click();
  }
  await expect(pill).toHaveAttribute("data-install", "npm");
});

test("without a clipboard, copy selects the text instead and throws nothing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) } });
  });
  const noise = watch(page);
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  const copy = pill.getByRole("button", { name: "Copy install command" });
  await copy.click();
  await expect(copy).not.toHaveAttribute("data-copied");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("npm i @lucasmarkes/hairline");

  const snippet = page.locator("[data-snippet]");
  await snippet.getByRole("button", { name: "Copy snippet" }).click();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("<Terrain />");
  expect(noise).toEqual([]);
});

test("Get started leads to the docs, whose quick start pastes three ways and copies the tab on show", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  const quick = page.locator("#quick-start");
  await expect(quick.getByRole("tab")).toHaveText(["React", "Vanilla", "CDN"]);
  await expect(quick.locator(".code-title")).toHaveText("app/page.tsx");
  await quick.getByRole("tab", { name: "CDN" }).click();
  await expect(quick.locator(".code-title")).toHaveText("index.html");
  await expect(quick.getByRole("tabpanel")).toContainText("https://esm.sh/@lucasmarkes/hairline");
  await quick.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^<div id="figure"/);
  await expect(page.locator("#options [data-options] tbody tr td:first-child")).toHaveText(["intensity", "theme", "label", "onRead"]);
});

test("llms.txt and the registry item are served", async ({ request }) => {
  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  expect(await llms.text()).toContain("# hairline");

  const item = await (await request.get("/r/hairline.json")).json();
  expect(item.name).toBe("hairline");
  expect(item.dependencies).toEqual(["@lucasmarkes/hairline"]);
  expect(item.files[0].path).toBe("components/ui/hairline.tsx");
  expect(item.files[0].content).toContain('"use client"');
});

test("the page fits a phone, with the longest install command and every control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const width = () => page.evaluate(() => document.documentElement.scrollWidth);
  expect(await width()).toBeLessThanOrEqual(390);

  const pill = page.locator("[data-install]").first();
  for (let i = 0; i < 4; i++) await pill.getByRole("button", { name: /: switch to/ }).click();
  await expect(pill).toHaveAttribute("data-install", "shadcn");
  expect(await width()).toBeLessThanOrEqual(390);

  const inspector = page.locator("[data-inspector]");
  for (const name of ["Turntable", "Dark"]) {
    const control = inspector.getByRole("radio", { name });
    await control.click();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await inspector.getByRole("slider", { name: "Intensity" }).fill("0.85");
  await expect(inspector.locator("[data-snippet] pre")).toContainText('<Turntable intensity={0.85} theme="dark" />');
  expect(await width()).toBeLessThanOrEqual(390);
});

test("without a clipboard at all, the top bar's llms.txt button opens the file", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  const noise = watch(page);
  await page.goto("/");
  await page.locator(".topbar").getByRole("button", { name: "llms.txt" }).click();
  await expect(page).toHaveURL(/\/llms\.txt$/);
  // the text file has no icon, so Chrome's own request for /favicon.ico 404s there
  expect(noise.filter((line) => line.startsWith("pageerror"))).toEqual([]);
});

/** Every element that holds text of its own, outside code, the hero's serif word and the figures, with its family. */
const families = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      // the install pill is code, prompt and all
      .filter((el) => !el.closest("h1 em, code, pre, .pill, [data-hairline]") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .map((el) => `${el.tagName} ${getComputedStyle(el).fontFamily}`),
  );

test("one family outside the hero: the serif is the headline's one word, mono is code", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1 em")).toHaveCSS("font-family", /Instrument Serif/);
  const home = await families(page);
  expect(home.length).toBeGreaterThan(5);
  expect(home.filter((f) => !/geist/i.test(f) || /mono/i.test(f))).toEqual([]);

  await page.goto("/docs");
  const docs = await families(page);
  expect(docs.length).toBeGreaterThan(40);
  expect(docs.filter((f) => !/geist/i.test(f) || /mono/i.test(f))).toEqual([]);
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] h3`)).toHaveCSS("font-style", "normal");
});

test("a command wider than the pill fades at the edge until it is scrolled to its end, and shows itself whole on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  const line = pill.locator("code");
  await expect(line).not.toHaveAttribute("data-more");
  await expect(line).toHaveCSS("mask-image", "none");

  for (let i = 0; i < 4; i++) await pill.getByRole("button", { name: /: switch to/ }).click();
  const [, shadcn] = MANAGERS[4];
  await expect(line).toHaveAttribute("title", shadcn);
  await expect(line).toHaveAttribute("data-more", "");
  await expect(line).toHaveCSS("mask-image", /gradient/);

  await line.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(line).not.toHaveAttribute("data-more");
  await expect(line).toHaveCSS("mask-image", "none");
});

test("the footer links the author's site, then X, GitHub, npm and llms.txt", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Lucas Marques" })).toHaveAttribute("href", "https://lucasmarkes.com");
  await expect(footer.getByRole("link", { name: "X", exact: true })).toHaveAttribute("href", "https://x.com/lucasmarkes__");
  await expect(footer.getByRole("link")).toHaveText(["Lucas Marques", "X", "GitHub", "npm", "llms.txt"]);
});

test("a code block copies its code without the line numbers, and a signature has none", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs");
  const blocks = page.locator("#react [data-code]");
  await expect(blocks.locator(".code-title")).toHaveText(["Signature", "app/page.tsx"]);
  const usage = blocks.last();
  await usage.getByRole("button", { name: "Copy code" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")[0]).toBe('import { Terrain } from "@lucasmarkes/hairline/react";');
  expect(text).not.toMatch(/^\s*\d/m);
  const number = (block: typeof usage) => block.locator(".line").first().evaluate((el) => getComputedStyle(el, "::before").content);
  expect(await number(usage)).not.toBe("none");
  expect(await number(blocks.first())).toBe("none");
});

test("the quick start remembers the tab a reader picked", async ({ page }) => {
  await page.goto("/docs");
  const quick = page.locator("#quick-start");
  await quick.getByRole("tab", { name: "Vanilla" }).click();
  await page.reload();
  await expect(quick.getByRole("tab", { name: "Vanilla" })).toHaveAttribute("aria-selected", "true");
  await expect(quick.locator(".code-title")).toHaveText("main.ts");
});

test("when storage throws, the quick start stays on React and still switches, with a clean console", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  const noise = watch(page);
  await page.goto("/docs");
  const quick = page.locator("#quick-start");
  await expect(quick.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
  await quick.getByRole("tab", { name: "CDN" }).click();
  await expect(quick.getByRole("tab", { name: "CDN" })).toHaveAttribute("aria-selected", "true");
  expect(noise).toEqual([]);
});

test("the docs fit a phone down to 320px: rows stack text first, and wide code and tables scroll in their own box", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/docs");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const row = page.locator('[data-row="terrain"]');
    // the whole text block, so a tile centred beside a short heading does not pass for stacked
    const text = (await row.locator(":scope > div").first().boundingBox())!;
    const tile = (await row.locator(".tile").boundingBox())!;
    expect(tile.y).toBeGreaterThan(text.y + text.height);
  }
});

test("the figures' link goes to the home's figure", async ({ page }) => {
  await page.goto("/docs");
  await page.getByRole("link", { name: "Try them on the home page →" }).click();
  await expect(page).toHaveURL(/\/#try$/);
  await expect(page.locator("#try [data-inspector]")).toBeInViewport();
});

test("the sidebar's links land on their section under the top bar and mark it, and scrolling moves the mark", async ({ page }) => {
  await page.goto("/docs");
  const nav = page.getByRole("navigation", { name: "Docs" });
  await expect(nav.getByRole("link")).toHaveText(["Install", "Quick start", "Options", "React", "Vanilla", "CDN", "Figures", "Theme", "Accessibility"]);
  await expect(nav.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");

  await nav.getByRole("link", { name: "Theme" }).click();
  await expect(page).toHaveURL(/\/docs#theme$/);
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  await expect(nav.locator("[aria-current]")).toHaveCount(1);
  await expect.poll(() => page.locator("#theme-title").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(54);

  await page.evaluate(() => document.getElementById("figures")!.scrollIntoView());
  await expect(nav.getByRole("link", { name: "Figures" })).toHaveAttribute("aria-current", "location");

  // Accessibility is too short to reach the band; the end of the page marks it
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(nav.getByRole("link", { name: "Accessibility" })).toHaveAttribute("aria-current", "location");
});

test("opening /docs#theme lands on Theme, clear of the top bar, with Theme marked", async ({ page }) => {
  await page.goto("/docs#theme");
  const nav = page.getByRole("navigation", { name: "Docs" });
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  const top = await page.locator("#theme-title").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(54);
  expect(top).toBeLessThan(200);
});

test("on a phone the sidebar is one strip under the top bar, and it follows the reader", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/docs");
  const strip = page.locator(".doc-strip");
  const scroller = strip.locator(".doc-strip-scroll");
  await expect(strip).toBeVisible();
  await expect(page.locator(".doc-sidebar")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(scroller).toHaveAttribute("data-end");
  await expect(scroller).not.toHaveAttribute("data-start");

  const inside = async (name: string) => {
    const s = (await scroller.boundingBox())!;
    const b = (await strip.getByRole("link", { name }).boundingBox())!;
    return b.x >= s.x - 1 && b.x + b.width <= s.x + s.width + 1;
  };
  // the page moves, not the strip: the strip has to bring Accessibility in by itself
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(strip.getByRole("link", { name: "Accessibility" })).toHaveAttribute("aria-current", "location");
  await expect.poll(() => inside("Accessibility")).toBe(true);
  await expect(scroller).toHaveAttribute("data-start");

  await strip.getByRole("link", { name: "Install" }).click();
  await expect(page).toHaveURL(/#install$/);
  await expect(strip.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
  await expect.poll(() => inside("Install")).toBe(true);
  // the heading clears the top bar and the strip
  await expect.poll(async () => {
    const s = (await strip.boundingBox())!;
    const t = (await page.locator("#install-title").boundingBox())!;
    return t.y >= s.y + s.height;
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the sidebar is plain links that still move the page, and the quick start shows React", async ({ page }) => {
    await page.goto("/docs");
    const nav = page.getByRole("navigation", { name: "Docs" });
    await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("href", "#theme");
    await nav.getByRole("link", { name: "Theme" }).click();
    await expect(page).toHaveURL(/\/docs#theme$/);
    const quick = page.locator("#quick-start");
    await expect(quick.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
    await expect(quick.locator(".code-title")).toHaveText("app/page.tsx");
  });
});
