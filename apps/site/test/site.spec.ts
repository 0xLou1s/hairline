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

test("the top bar holds the skill, the docs, the story, the version and GitHub, and no llms.txt button", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".topbar nav > *")).toHaveCount(5);
  await expect(page.locator(".topbar nav > a").nth(0)).toHaveText("Skill");
  await expect(page.locator(".topbar nav > a").nth(1)).toHaveText("Docs");
  await expect(page.locator(".topbar")).not.toContainText("llms.txt");
});

test("the top bar's links sit as one row: one height, one centre line, one type, even spaces between them", async ({ page }) => {
  await page.goto("/");
  const items = await page.locator(".topbar nav > *").evaluateAll((els) => els.map((el) => {
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    // what the eye reads as the item: its text, or its icon
    const ink = (el.querySelector("svg") ?? range).getBoundingClientRect();
    const style = getComputedStyle(el);
    return { height: box.height, middle: box.top + box.height / 2, left: ink.left, right: ink.right, type: [style.fontSize, style.fontWeight, style.color, style.backgroundColor].join(" ") };
  }));
  expect(items).toHaveLength(5);
  expect(new Set(items.map((i) => i.height)).size).toBe(1);
  for (const i of items) expect(Math.abs(i.middle - items[0].middle)).toBeLessThan(0.5);
  expect(new Set(items.map((i) => i.type)).size).toBe(1);
  const spaces = items.slice(1).map((i, n) => i.left - items[n].right);
  for (const s of spaces) expect(Math.abs(s - spaces[0])).toBeLessThan(1.5);
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
  // seven blocks of highlighted code, nearly two hundred spans: a page that lost its highlighting falls far short
  expect(colours.length).toBeGreaterThan(150);
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

/** Waits for every transition and entrance on the page to finish. */
const settled = (page: Page) => expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);

/** Where a picker's highlight shows: its box, less what its clip-path cuts from each side. */
const lit = (page: Page, name: string) =>
  page.getByRole("radiogroup", { name }).evaluate((group) => {
    const hl = group.querySelector<HTMLElement>(".slide-hl")!;
    const box = hl.getBoundingClientRect();
    const inset = getComputedStyle(hl).clipPath.match(/^inset\((.*?)(?: round .*)?\)$/)?.[1].split(" ").map(parseFloat) ?? [0];
    const [t, r = t, b = t, l = r] = inset;
    return { left: box.left + l, right: box.right - r, top: box.top + t, bottom: box.bottom - b };
  });
const checked = (page: Page, name: string) =>
  page.getByRole("radiogroup", { name }).locator('[aria-checked="true"]').evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  });
const near = (a: Record<string, number>, b: Record<string, number>) => {
  for (const k of Object.keys(b)) expect(Math.abs(a[k] - b[k]), k).toBeLessThan(0.75);
};

test("a picker's highlight lands on the checked option by moving and clipping, never by animating its size", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  for (const name of ["Figure", "Theme"]) {
    const group = page.getByRole("radiogroup", { name });
    expect(await group.locator(".slide-hl").evaluate((el) => getComputedStyle(el).transitionProperty)).not.toMatch(/width|height/);
    for (const radio of await group.getByRole("radio").all()) {
      await radio.click();
      await settled(page);
      near(await lit(page, name), await checked(page, name));
    }
  }
});

test("the arrow keys move a picker's highlight at once, and a click still slides it", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  const figures = page.getByRole("radiogroup", { name: "Figure" });
  const hl = figures.locator(".slide-hl");
  await figures.getByRole("radio", { name: "Terrain" }).press("ArrowRight");
  expect(await hl.evaluate((el) => el.getAnimations().length)).toBe(0);
  near(await lit(page, "Figure"), await checked(page, "Figure"));
  await figures.getByRole("radio", { name: "Riffle" }).click();
  expect(await hl.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
});

test("the theme switch repaints the plate in the same frame as the figure", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  const inspector = page.locator("[data-inspector]");
  await inspector.getByRole("radio", { name: "Dark" }).click();
  // the stage's own entrance has finished; what is left would be a transition
  expect(await inspector.locator(".s-stage").evaluate((el) => el.getAnimations().filter((a) => a instanceof CSSTransition).length)).toBe(0);
});

test("the home's entrance settles within 1.4s, with its hero blocks 70ms apart", async ({ page }) => {
  await page.goto("/");
  const timing = await page.evaluate(() => {
    const of = (el: Element) => el.getAnimations().map((a) => a.effect!.getComputedTiming());
    const hero = [...document.querySelectorAll(".hero-rise > *")].map((el) => Math.min(...of(el).map((t) => Number(t.delay))));
    const end = Math.max(...[...document.querySelectorAll(".hero-rise > *, .enter")].flatMap((el) => of(el).map((t) => Number(t.endTime))));
    return { gaps: hero.slice(1).map((d, n) => d - hero[n]), end };
  });
  expect(timing.gaps).toEqual([70, 70, 70]);
  expect(timing.end).toBeLessThanOrEqual(1400);
});

test("a hero button's text holds still through a press: no jump when its layer comes and goes", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  // the press is what is watched; following the link would end the recording
  await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
  for (const name of ["Get started", "GitHub"]) {
    const button = page.locator(".hero-actions").getByRole("link", { name });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    // what the compositor draws, frame by frame, which a screenshot would redraw from scratch
    const cdp = await page.context().newCDPSession(page);
    const frames: { at: number; data: string }[] = [];
    cdp.on("Page.screencastFrame", (f) => {
      frames.push({ at: Date.now(), data: f.data });
      cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "png" });
    await page.mouse.down();
    await page.waitForTimeout(400);
    await page.mouse.up();
    const up = Date.now();
    await page.waitForTimeout(600);
    await cdp.send("Page.stopScreencast");
    await cdp.detach();
    const viewport = page.viewportSize()!.width;
    // the release eases out, so its last frame moves the text least; a jump there is the text being redrawn
    const release = frames.filter((f) => f.at > up).map((f) => f.data);
    expect(release.length).toBeGreaterThan(2);
    const worst = await page.evaluate(async ({ frames, box, viewport }) => {
      const text = async (data: string) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
        const s = bitmap.width / viewport;
        const [x, y, w, h] = [box.x + 12, box.y + 8, box.width - 24, box.height - 16].map((v) => Math.round(v * s));
        const canvas = new OffscreenCanvas(w, h);
        canvas.getContext("2d")!.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
        return canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
      };
      const [before, after] = await Promise.all(frames.map(text));
      let worst = 0;
      for (let k = 0; k < before.length; k += 4) worst = Math.max(worst, Math.abs(before[k] - after[k]));
      return worst;
    }, { frames: release.slice(-2), box, viewport });
    expect(worst, name).toBeLessThan(64);
  }
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

test("the sidebar marks its section with one black dot before its ink text, and no pill", async ({ page }) => {
  await page.goto("/docs");
  const nav = page.locator(".doc-sidebar");
  await nav.getByRole("link", { name: "Theme" }).click();
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  const read = () => nav.evaluate((nav) => {
    const ink = (el: Element) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    };
    const on = nav.querySelector("a[aria-current]")!;
    const off = nav.querySelector("a:not([aria-current])")!;
    const dots = [...nav.querySelectorAll(".doc-dot")];
    const dot = dots[0]?.getBoundingClientRect();
    const box = on.getBoundingClientRect();
    return {
      dots: dots.length,
      size: dot && [Math.round(dot.width), Math.round(dot.height)],
      fill: dots[0] && getComputedStyle(dots[0]).backgroundColor,
      round: dots[0] && getComputedStyle(dots[0]).borderRadius,
      level: dot && Math.abs(dot.top + dot.height / 2 - (box.top + box.height / 2)),
      clear: dot && ink(on).left - dot.right,
      inside: dot && dot.left >= box.left,
      // the text moves aside for the dot: its distance from the link's edge, against an unmarked link's
      shift: Math.round(ink(on).left - box.left - (ink(off).left - off.getBoundingClientRect().left)),
      on: [getComputedStyle(on).color, getComputedStyle(on).backgroundColor],
      off: [getComputedStyle(off).color, getComputedStyle(off).backgroundColor],
    };
  });
  await expect.poll(async () => (await read()).shift).toBe(12);
  const r = await read();
  expect(r.dots).toBe(1);
  expect(r.size).toEqual([5, 5]);
  expect(r.fill).toBe("rgb(10, 10, 10)");
  expect(r.round).toBe("50%");
  expect(r.level).toBeLessThan(1);
  expect(r.clear).toBeGreaterThanOrEqual(4);
  expect(r.inside).toBe(true);
  expect(r.on).toEqual(["rgb(10, 10, 10)", "rgba(0, 0, 0, 0)"]);
  expect(r.off).toEqual(["rgb(115, 115, 115)", "rgba(0, 0, 0, 0)"]);
});

test("the dot travels from section to section instead of jumping, and under reduced motion it jumps", async ({ page }) => {
  await page.goto("/docs");
  const nav = page.locator(".doc-sidebar");
  await expect(nav.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
  const flight = () => nav.evaluate((nav) => new Promise<number[]>((done) => {
    const dot = nav.querySelector(".doc-dot")!;
    const ys: number[] = [];
    const t0 = performance.now();
    const tick = () => {
      // from the column's top: the column itself moves up as it sticks
      const r = dot.getBoundingClientRect();
      ys.push(r.top + r.height / 2 - nav.getBoundingClientRect().top);
      if (performance.now() - t0 < 700) requestAnimationFrame(tick);
      else done(ys);
    };
    requestAnimationFrame(tick);
    // straight to Theme: no section passes through the band on the way, so the mark moves once
    document.getElementById("theme")!.scrollIntoView({ behavior: "instant" });
  }));
  const centre = (name: string) => nav.getByRole("link", { name }).evaluate((a) => {
    const r = a.getBoundingClientRect();
    return r.top + r.height / 2 - a.closest("nav")!.getBoundingClientRect().top;
  });
  const from = await centre("Install");
  const to = await centre("Theme");
  const ys = await flight();
  expect(ys.filter((y) => y > from + 2 && y < to - 2).length).toBeGreaterThanOrEqual(3);
  expect(Math.abs(ys[ys.length - 1] - to)).toBeLessThan(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(nav.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
  await page.waitForTimeout(800);
  const jump = await flight();
  expect(jump.filter((y) => y > from + 2 && y < to - 2)).toEqual([]);
});

test("a deep link marks only its own section, with no other marked first", async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    const note = (el: Element) => el.matches(".doc-sidebar a[aria-current]") && seen.push(el.textContent!);
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes") note(r.target as Element);
        for (const n of r.addedNodes) if (n instanceof Element) [n, ...n.querySelectorAll("*")].forEach(note);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current"] });
  });
  await page.goto("/docs#theme");
  const nav = page.locator(".doc-sidebar");
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  expect([...new Set(await page.evaluate(() => (window as unknown as { seen: string[] }).seen))]).toEqual(["Theme"]);
});

test("on a tall screen, a click on a section near the end marks that section, not the last", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  await page.goto("/docs");
  const nav = page.locator(".doc-sidebar");
  await nav.getByRole("link", { name: "Theme" }).click();
  // the page cannot scroll Theme up to the top bar: it stops at its end, with Theme in view
  await expect.poll(() => page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)).toBe(true);
  await page.waitForTimeout(300);
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
});

test("on a short screen the sidebar scrolls inside itself instead of running off the bottom", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/docs");
  const side = await page.locator(".doc-sidebar").evaluate((el) => ({ bottom: el.getBoundingClientRect().bottom, scrolls: el.scrollHeight > el.clientHeight, overflow: getComputedStyle(el).overflowY }));
  expect(side.bottom).toBeLessThanOrEqual(420);
  expect(side.scrolls).toBe(true);
  expect(side.overflow).toBe("auto");
});

// the band starts under the sticky chrome, which is taller on a phone, where the strip sits under the top bar
for (const [from, to, nav] of [[1280, 390, ".doc-strip"], [390, 1280, ".doc-sidebar"]] as const) {
  test(`after the window goes from ${from} to ${to}px wide, a click marks the section it lands on`, async ({ page }) => {
    await page.setViewportSize({ width: from, height: 800 });
    await page.goto("/docs");
    await page.setViewportSize({ width: to, height: 800 });
    const links = page.locator(nav);
    for (const name of ["Theme", "Options", "CDN"]) {
      await links.getByRole("link", { name }).click();
      // the smooth scroll has stopped: two reads 150ms apart agree
      await expect.poll(() => page.evaluate(() => new Promise<number>((r) => {
        const y = scrollY;
        setTimeout(() => r(scrollY - y), 150);
      }))).toBe(0);
      await expect(links.getByRole("link", { name })).toHaveAttribute("aria-current", "location");
    }
  });
}

test.describe("on a 2x screen", () => {
  test.use({ deviceScaleFactor: 2 });

  // Both of the rise's last changes come in steps. Text is drawn on whole device pixels as it moves, so its last pixel of
  // travel is a hop; and Chrome draws no blur under 0.4px, so the blur goes from soft to sharp in one frame. Each reads as
  // a twitch on a block that looks settled, so both happen while the block is still fading in.
  test("the home's blocks come home before their blur clears, and clear it while still fading in", async ({ page }) => {
    await page.goto("/");
    const blocks = page.locator(".hero-rise > *, .enter");
    expect(await blocks.count()).toBeGreaterThanOrEqual(7);
    const late = await blocks.evaluateAll((els) => els.flatMap((el) => {
      const anims = el.getAnimations();
      anims.forEach((a) => a.pause());
      const end = Math.max(...anims.map((a) => Number(a.effect!.getComputedTiming().endTime)));
      for (let t = 0; t <= end; t += 1000 / 120) {
        anims.forEach((a) => (a.currentTime = t));
        const style = getComputedStyle(el);
        const blur = parseFloat(style.filter.match(/blur\(([\d.]+)px\)/)?.[1] ?? "0");
        const away = Math.abs(new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform).m42) * devicePixelRatio;
        if (blur < 0.4 && away >= 0.5) return [`${el.className} moves sharp at ${Math.round(t)}ms`];
        if (Number(style.opacity) >= 0.9 && blur >= 0.4) return [`${el.className} is still blurred at ${Math.round(t)}ms`];
      }
      return [];
    }));
    expect(late).toEqual([]);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the sidebar is plain links that still move the page, and the quick start shows React", async ({ page }) => {
    await page.goto("/docs");
    const nav = page.getByRole("navigation", { name: "Docs" });
    await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("href", "#theme");
    // the script marks the section in view; without it nothing is marked, rather than Install whatever the reader sees
    await expect(page.locator("[aria-current]")).toHaveCount(0);
    await expect(page.locator(".doc-dot")).toHaveCount(0);
    await nav.getByRole("link", { name: "Theme" }).click();
    await expect(page).toHaveURL(/\/docs#theme$/);
    const quick = page.locator("#quick-start");
    await expect(quick.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
    await expect(quick.locator(".code-title")).toHaveText("app/page.tsx");
  });
});

test("a deep link lands on its section at once, without sweeping down the page", async ({ page }) => {
  await page.goto("/docs#theme");
  // read at once, not polled: a smooth scroll from the top would still be under way
  const top = await page.locator("#theme-title").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(54);
  expect(top).toBeLessThan(200);
});

test("back at the top of the page, Install is marked again", async ({ page }) => {
  await page.goto("/docs");
  const nav = page.getByRole("navigation", { name: "Docs" });
  await page.evaluate(() => document.getElementById("theme")!.scrollIntoView({ behavior: "instant" }));
  await expect(nav.getByRole("link", { name: "Theme" })).toHaveAttribute("aria-current", "location");
  // an instant jump, as Back makes under reduced motion: no section passes through the band on the way
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(nav.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
});

test("a click in the sidebar still scrolls smoothly to its section", async ({ page }) => {
  await page.goto("/docs");
  await page.getByRole("navigation", { name: "Docs" }).getByRole("link", { name: "Theme" }).click();
  const final = await page.locator("#theme").evaluate((el) => el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(el).scrollMarginTop));
  // just after the click the page is still on its way
  expect(await page.evaluate(() => scrollY)).toBeLessThan(final - 100);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(final - 2);
});

test("the top bar's Inspo link opens the story of how Hairline was made, with a clean console", async ({ page }) => {
  const noise = watch(page);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Inspo" }).click();
  await expect(page).toHaveURL(/\/inspo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How Hairline was made");
  await expect(page.locator("[data-step]")).toHaveCount(7);
  // the story is the arguing: each pushback names what it changed
  await expect(page.locator("[data-pushback] > li")).toHaveCount(5);
  for (const item of await page.locator("[data-pushback] > li").all()) await expect(item.locator("[data-changed]")).not.toBeEmpty();
  expect(noise).toEqual([]);
});

test("every picture on /inspo loads and says what it shows", async ({ page }) => {
  await page.goto("/inspo");
  const images = page.locator("main img");
  await expect(images).toHaveCount(5);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    expect((await img.getAttribute("alt"))?.length).toBeGreaterThan(20);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
});

test("/inspo fits a phone down to 320px", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/inspo");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("every small label on /inspo is set the same: one face, size, weight and colour", async ({ page }) => {
  await page.goto("/inspo");
  const types = await page.locator(".inspo-label").evaluateAll((els) => els.map((el) => {
    const s = getComputedStyle(el);
    return [s.fontFamily, s.fontSize, s.fontWeight, s.letterSpacing, s.color].join(" ");
  }));
  expect(types.length).toBeGreaterThan(10);
  expect(new Set(types).size).toBe(1);
});

test("the rules on /inspo say they are rules, so their numbers don't read as steps", async ({ page }) => {
  await page.goto("/inspo");
  await expect(page.locator(".inspo-rules .inspo-n")).toHaveText(["Rule 09", "Rule 10"]);
});
