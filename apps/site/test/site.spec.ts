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

test("the page prerenders empty boxes, then draws seven figures with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  // every figure's box is empty on the server (the GitHub icon is the only svg)
  expect(html.match(/<div style="aspect-ratio:5 \/ 4"><\/div>/g)).toHaveLength(7);
  expect(html).not.toMatch(/aspect-ratio:5 \/ 4"[^>]*><svg/);
  expect(html).not.toMatch(/Fig\. \d/);

  const noise = watch(page);
  await page.goto("/");
  // the inspector's, and one per row
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(7);
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] [data-hairline] > svg > *`).first()).toBeAttached();
  await expect(page.locator("[data-install]").first()).toHaveText(/npm i @lucasmarkes\/hairline/);
  await expect(page.locator("[data-size]")).toHaveText(/^\d+\.\d kB$/);
  await expect(page.locator("[data-version]")).toHaveText(/^v\d+\.\d+\.\d+/);
  expect(noise).toEqual([]);
});

test("the inspector's chips pick the figure, and the snippet follows", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain />");
  await inspector.getByRole("button", { name: "Riffle" }).click();
  await expect(inspector.locator("[data-figure]")).toHaveAttribute("data-figure", "riffle");
  await expect(inspector.locator("[data-hairline]")).toHaveCount(1);
  await expect(inspector.locator("[data-read]")).toHaveText("rest");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('import { Riffle } from "@lucasmarkes/hairline/react";');
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Riffle />");
});

test("the inspector's slider reaches the figure, and the snippet shows it", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  const slider = inspector.getByRole("slider", { name: "intensity" });
  const stage = inspector.locator("[data-hairline]");
  const box = (await stage.boundingBox())!;
  const hover = async () => {
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(1200);
  };

  await slider.fill("0");
  await expect(inspector.locator("output")).toHaveText("0.00");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain intensity={0} />");
  await hover();
  const subtle = await drawing(page);

  await slider.fill("1");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain intensity={1} />");
  await hover();
  expect(await drawing(page)).not.toBe(subtle);

  await slider.fill("0.5");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText("<Terrain />");
});

test("the inspector's theme switch repaints the figure", async ({ page }) => {
  await page.goto("/");
  const inspector = page.locator("[data-inspector]");
  await inspector.getByRole("button", { name: "Dark" }).click();
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('<Terrain theme="dark" />');
  const plate = () => inspector.locator("[data-hairline] svg path").first().evaluate((el) => getComputedStyle(el).fill);
  await expect.poll(plate).toBe("rgb(8, 9, 10)");
  await inspector.getByRole("button", { name: "Auto" }).click();
  await expect.poll(plate).toBe("rgb(255, 255, 255)");
});

test("the install pill copies every manager's command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const pill = page.locator("[data-install]").first();
  for (const [label, code] of MANAGERS) {
    await expect(pill).toHaveAttribute("data-install", label);
    await expect(pill.locator("code")).toHaveText(code);
    await pill.getByRole("button", { name: "Copy" }).click();
    await expect(pill.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await pill.getByRole("button", { name: new RegExp(`^${label}: switch to`) }).click();
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
  await pill.getByRole("button", { name: "Copy" }).click();
  await expect(pill.getByRole("button", { name: "Copy" })).toBeVisible();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("npm i @lucasmarkes/hairline");

  const snippet = page.locator("[data-snippet]");
  await snippet.getByRole("button", { name: "Copy" }).click();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("<Terrain />");
  expect(noise).toEqual([]);
});

test("the quickstart pastes four ways and lists the four options", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/#quickstart$/);
  const quick = page.locator("section[aria-labelledby=quickstart]");
  await expect(quick.getByRole("tab")).toHaveText(["React", "Vanilla", "CDN", "CSS"]);
  await quick.getByRole("tab", { name: "CSS" }).click();
  await expect(quick.locator(".code-panel")).toContainText("--hairline-plate: #ffffff;");
  await quick.locator(".code").getByRole("button", { name: "Copy" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("--hairline-stroke: 0.9;");
  await expect(quick.locator("[data-options] tbody tr td:first-child")).toHaveText(["intensity", "theme", "label", "onRead"]);
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
    const control = inspector.getByRole("button", { name });
    await control.click();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await inspector.getByRole("slider", { name: "intensity" }).fill("0.85");
  await expect(inspector.locator("[data-snippet] .code-panel")).toContainText('<Turntable intensity={0.85} theme="dark" />');
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

test("each figure row names its figure in italic serif", async ({ page }) => {
  await page.goto("/");
  for (const id of IDS) await expect(page.locator(`[data-row="${id}"] h3`)).toHaveCSS("font-style", "italic");
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
