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

/**
 * Measured inside the frame, apart from how the frame is fitted: whether its page scrolls, and the band left under
 * its column beyond the page's own 24px of padding.
 */
const fit = (frame: FrameLocator) => frame.locator("main").evaluate((main) => ({
  scrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
  band: window.innerHeight - main.getBoundingClientRect().bottom - 24,
}));

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

test("each frame is named by what its figure means, and shows the page the skill wrote, light", async ({ page, request }) => {
  await page.goto("/skill");
  await expect(page.locator("[data-example]")).toHaveCount(4);
  for (const row of await page.locator("[data-example]").all()) {
    const frame = row.locator("iframe");
    expect((await frame.getAttribute("title"))!.length).toBeGreaterThan(20);
    const src = (await frame.getAttribute("src"))!;
    expect(src).toMatch(/^\/skill\/hairline-[a-z0-9-]+\.html\?theme=light$/);
    const res = await request.get(src.replace(/\?.*$/, ""));
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
    expect(await res.text()).toContain('id="hl-figure"');
  }
});

test("each example shows the figure, its controls and what it means, without the page's name tags or rules line", async ({ page }) => {
  await page.goto("/skill");
  await expect(page.getByRole("link", { name: "Open the page" })).toHaveCount(0);
  for (const frame of await frames(page)) {
    for (const hidden of ["#name", "#read", "#rules"]) await expect(frame.locator(hidden)).toBeHidden();
    await expect(frame.locator("#means")).toBeVisible();
    await expect(frame.locator("#intensity")).toBeVisible();
  }
});

test("each example is named by its prompt, and each copy button says which line it copies", async ({ page }) => {
  await page.goto("/skill");
  for (const idea of IDEAS) {
    const row = page.getByRole("article", { name: `/hairline-create ${idea}`, exact: true });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("button", { name: `Copy prompt: ${idea}`, exact: true })).toHaveCount(1);
  }
  await expect(page.getByRole("button", { name: "Copy follow-up: git branches", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Copy follow-up: weather over a city", exact: true })).toHaveCount(1);
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
      await expect.poll(async () => { const f = await fit(frame); return !f.scrolls && f.band < 1; }).toBe(true);
    }
  });
}

for (const width of [320, 900]) {
  test(`at ${width}px every prompt reads whole, and the install line fades while more of it is hidden`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/skill");
    const lines = page.locator('[data-command="prompt"] .pill-line');
    await expect(lines).toHaveCount(4);
    for (const over of await lines.evaluateAll((els) => els.map((el) => el.scrollWidth - el.clientWidth))) expect(over).toBeLessThanOrEqual(0);
    const install = page.locator('[data-command="install"] .pill-line');
    expect(await install.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("nowrap");
    const hidden = await install.evaluate((el) => el.scrollWidth - el.clientWidth > 1);
    if (hidden) {
      await expect(install).toHaveAttribute("data-more", "");
      await install.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
      await expect(install).not.toHaveAttribute("data-more");
    } else {
      await expect(install).not.toHaveAttribute("data-more");
    }
  });
}

test("at 1200px each plate starts on its prompt's line and meets the column's edges", async ({ page }) => {
  await page.goto("/skill");
  await frames(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const row of await page.locator("[data-example]").all()) {
    const m = await row.evaluate((el) => {
      const frame = el.querySelector("iframe")!;
      const at = frame.getBoundingClientRect();
      const plate = frame.contentDocument!.querySelector(".plate")!.getBoundingClientRect();
      const figure = el.querySelector(".example-figure")!.getBoundingClientRect();
      const pill = el.querySelector('[data-command="prompt"]')!.getBoundingClientRect();
      return { top: at.top + plate.top - pill.top, left: at.left + plate.left - figure.left, right: at.left + plate.right - figure.right };
    });
    for (const d of Object.values(m)) expect(Math.abs(d)).toBeLessThan(1);
  }
});

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

  test("/skill still gives the install command, the prompts and the frames with the pages", async ({ page }) => {
    await page.goto("/skill");
    await expect(page.locator('[data-command="install"]')).toHaveText(new RegExp(INSTALL));
    await expect(page.locator('[data-command="prompt"]')).toHaveCount(4);
    await expect(page.locator('[data-example] iframe[src^="/skill/hairline-"]')).toHaveCount(4);
  });
});

test("the top bar's Skill link opens /skill", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Skill" }).click();
  await expect(page).toHaveURL(/\/skill$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your own figure");
});

test("the top bar fits a 320px screen on one row, the version left out so the name stands clear of the links", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/skill");
  await expect(page.locator(".topbar [data-version]")).toBeHidden();
  // from the name's last letter to the Skill link's first: at least the 20px the links keep between each other
  const gap = await page.evaluate(() => {
    const text = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
    return text(document.querySelector(".topbar-link")!).left - text(document.querySelector(".topbar > a")!).right;
  });
  expect(gap).toBeGreaterThanOrEqual(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const tops = await page.locator(".topbar nav > *").evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== "none").map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  const bar = (await page.locator(".topbar").boundingBox())!;
  const last = (await page.locator(".topbar nav > *").last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(bar.x + bar.width);
});

test("the home's hero points to the skill in one quiet line under its two buttons, and the line reaches /skill", async ({ page }) => {
  for (const width of [1200, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const link = page.locator(".hero-rise").getByRole("link", { name: "Or make your own with the skill →" });
    await expect(link).toHaveAttribute("href", "/skill");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const actions = (await page.locator(".hero-actions").boundingBox())!;
    const line = (await link.boundingBox())!;
    // under the buttons, clear of them, and on one line
    expect(line.y).toBeGreaterThanOrEqual(actions.y + actions.height);
    expect(line.height).toBeLessThan(28);
    // not a third button
    expect(await link.evaluate((a) => a.classList.contains("btn"))).toBe(false);
  }
  await page.locator(".hero-rise").getByRole("link", { name: "Or make your own with the skill →" }).click();
  await expect(page).toHaveURL(/\/skill$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your own figure");
});

const FOLLOW_UPS: Record<string, string | undefined> = {
  funnel: undefined,
  clearance: undefined,
  sidings: "The rails almost disappear and the trains read as loose blocks. Make it read as a railway at a glance.",
  storm: "The cloud looks like a stack of cylinders. Make it read as a cloud at a glance.",
};

test("a follow-up sits under its prompt as a second line that wraps instead of scrolling, and copies on its own", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/skill");
  for (const [name, text] of Object.entries(FOLLOW_UPS)) {
    const row = page.locator(`[data-example="${name}"]`);
    const line = row.locator('[data-command="follow-up"]');
    if (!text) { await expect(line).toHaveCount(0); continue; }
    await expect(line).toHaveText(text);
    const prompt = (await row.locator('[data-command="prompt"]').boundingBox())!;
    expect((await line.boundingBox())!.y).toBeGreaterThanOrEqual(prompt.y + prompt.height);
    expect(await line.locator(".pill-line").evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    await line.locator(".icopy").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  }
});
