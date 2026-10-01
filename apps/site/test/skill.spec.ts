import { expect, test, type FrameLocator, type Page } from "@playwright/test";

const INSTALL = "npx skills add lucasmarkes/hairline";
const IDEAS = ["a sales funnel", "a rate limiter", "git branches", "weather over a city"];

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

/** The frames are lazy: each is brought on screen, then waited for until its figure is drawn. */
async function frames(page: Page): Promise<FrameLocator[]> {
  const out: FrameLocator[] = [];
  for (let i = 0; i < IDEAS.length; i++) {
    const row = page.locator("[data-example]").nth(i);
    await row.scrollIntoViewIfNeeded();
    const frame = row.frameLocator("iframe");
    await expect(frame.locator("#stage svg")).toHaveCount(1);
    out.push(frame);
  }
  return out;
}

/** How tall the frame is, and how tall the page inside it needs to be. */
const fit = (frame: FrameLocator) => frame.locator("main").evaluate((main) => ({ frame: window.innerHeight, page: (main as HTMLElement).offsetHeight + 48 }));

test("/skill opens with the install command, four prompts and four live figures, and a clean console", async ({ page }) => {
  const noise = watch(page);
  await page.goto("/skill");
  await expect(page).toHaveTitle("Make your own figure · hairline");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your own figure");
  await expect(page.locator('[data-command="install"]')).toHaveText(new RegExp(INSTALL));
  await expect(page.locator('[data-command="prompt"]')).toHaveText(IDEAS.map((idea) => new RegExp(`/hairline-create ${idea}$`)));
  await expect(page.locator("[data-steps] > li")).toHaveCount(5);
  await frames(page);
  expect(noise).toEqual([]);
});

test("a figure on /skill answers the pointer and goes back to rest", async ({ page }) => {
  await page.goto("/skill");
  for (const frame of await frames(page)) {
    const read = frame.locator("#read");
    await expect(read).toHaveText("rest");
    // the frames were each brought on screen in turn; this one has to be on screen again for the pointer to reach it
    await frame.locator("#stage").scrollIntoViewIfNeeded();
    const box = (await frame.locator("#stage").boundingBox())!;
    // somewhere on the stage the figure picks something; walk a grid until it does
    let answered = false;
    for (const fy of [0.5, 0.35, 0.65]) {
      for (const fx of [0.5, 0.35, 0.65]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 4 });
        if ((await read.textContent()) !== "rest") { answered = true; break; }
      }
      if (answered) break;
    }
    expect(answered).toBe(true);
    await page.mouse.move(2, 2);
    await expect(read).toHaveText("rest");
  }
});

test("each frame is named by what its figure means, and its link opens the page the skill wrote", async ({ page, request }) => {
  await page.goto("/skill");
  await expect(page.locator("[data-example]")).toHaveCount(4);
  for (const row of await page.locator("[data-example]").all()) {
    const title = await row.locator("iframe").getAttribute("title");
    expect(title!.length).toBeGreaterThan(20);
    const href = await row.getByRole("link", { name: "Open the page" }).getAttribute("href");
    expect(href).toMatch(/^\/skill\/hairline-[a-z0-9-]+\.html$/);
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
    expect(await res.text()).toContain('id="hl-figure"');
  }
});

test("the install command and a prompt copy as they are written", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/skill");
  await page.locator('[data-command="install"] .icopy').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INSTALL);
  await page.locator('[data-command="prompt"] .icopy').nth(2).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("/hairline-create git branches");
});

for (const width of [1200, 320]) {
  test(`at ${width}px /skill does not scroll sideways, and no frame scrolls inside`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/skill");
    const list = await frames(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    for (const frame of list) {
      await expect.poll(async () => { const f = await fit(frame); return f.frame - f.page; }).toBe(0);
    }
  });
}

test.describe("on a dark system", () => {
  test.use({ colorScheme: "dark" });

  test("every frame is still light, as the site is", async ({ page }) => {
    await page.goto("/skill");
    for (const frame of await frames(page)) {
      expect(await frame.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).toBe("rgb(255, 255, 255)");
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/skill still gives the install command, the prompts and the links to the pages", async ({ page }) => {
    await page.goto("/skill");
    await expect(page.locator('[data-command="install"]')).toHaveText(new RegExp(INSTALL));
    await expect(page.locator('[data-command="prompt"]')).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Open the page" })).toHaveCount(4);
  });
});
