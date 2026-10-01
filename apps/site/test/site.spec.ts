import { expect, test, type Page } from "@playwright/test";

const IDS = ["riffle", "terrain", "exploded", "phosphor", "slow", "turntable"];

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

test("the page prerenders empty boxes and draws thirteen figures with a clean console", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("<svg");
  expect(html).toContain("pnpm add @lucasmarkes/hairline");

  const noise = watch(page);
  await page.goto("/");
  // six in the hero, one per section, one in the theme editor
  await expect(page.locator("[data-hairline] > svg")).toHaveCount(13);
  await expect(page.locator("[data-hero] [data-hairline] > svg > *").first()).toBeVisible();
  // every figure but Exploded has a caption at rest
  for (const id of IDS.filter((id) => id !== "exploded")) await expect(page.locator(`[data-section="${id}"] [data-read]`)).not.toBeEmpty();
  expect(noise).toEqual([]);
});

test("a slider moves the figure's option and both snippets", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('[data-section="riffle"]');
  await expect(section.locator(".code-panel")).toContainText("<Riffle stagger={40}");
  await section.locator("input[type=range]").fill("75");
  await expect(section.locator("output")).toHaveText("75 ms");
  await expect(section.locator(".code-panel")).toContainText("<Riffle stagger={75}");
  await section.getByRole("tab", { name: "Vanilla" }).click();
  await expect(section.locator(".code-panel")).toContainText("{ stagger: 75 }");
});

test("the install tabs switch and copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const install = page.locator("[data-install]");
  await install.getByRole("tab", { name: "npm", exact: true }).click();
  await expect(install.locator(".code-panel")).toHaveText("npm install @lucasmarkes/hairline");
  await install.getByRole("button", { name: "Copy" }).click();
  await expect(install.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install @lucasmarkes/hairline");
  await install.getByRole("tab", { name: "npm", exact: true }).press("ArrowLeft");
  await expect(install.getByRole("tab", { name: "pnpm" })).toBeFocused();
  await expect(install.locator(".code-panel")).toHaveText("pnpm add @lucasmarkes/hairline");
});

test("the theme editor repaints the figure and rewrites the CSS", async ({ page }) => {
  await page.goto("/");
  const theme = page.locator("section[aria-labelledby=theme]");
  await theme.getByRole("button", { name: "Dark" }).click();
  await expect(theme.locator("[data-theme-css]")).toContainText("--hairline-plate: #08090a;");
  const fill = await theme.locator("[data-hairline] svg path").first().evaluate((el) => getComputedStyle(el).fill);
  expect(fill).toBe("rgb(8, 9, 10)");
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

test("the page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
