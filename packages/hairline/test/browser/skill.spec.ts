import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { play } from "../parity/driver.mjs";
import { INTENSITY, SCRIPTS } from "../parity/scripts.mjs";

/**
 * The skill's bench (skills/hairline-create) with its examples on it: the page
 * an agent hands over. It answers the pointer, its controls reach the figure,
 * and it draws what the package draws, so the extracted kernel is the engine.
 */
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const clock = file("../parity/clock.js") + "\nwindow.__freeze(1000);";

type Step = Record<string, unknown>;
type Checkpoint = { at: string; read: string; svg: string };
/** Each example: a viewBox point that is on the figure, what the slider shows at its two ends, and how much of the package's script it can play. */
const EXAMPLES = {
  terrain: { at: [200, 160], ends: ["1.5", "5"], steps: (SCRIPTS as Record<string, Step[]>).terrain },
  /* Riffle on the bench has no keyboard, so its script stops where the package's reaches for it */
  riffle: {
    at: [150, 120], ends: ["0", "90"],
    steps: (SCRIPTS as Record<string, Step[]>).riffle.slice(0, (SCRIPTS as Record<string, Step[]>).riffle.findIndex((s) => "focus" in s)),
  },
} as Record<string, { at: [number, number]; ends: [string, string]; steps: Step[] }>;

const svg = (page: Page) => page.locator("#stage > svg").evaluate((el) => el.innerHTML);
const read = (page: Page) => page.locator("#read").innerText();
const setIntensity = (page: Page, value: number) => page.locator("#intensity").evaluate((el, value) => {
  (el as HTMLInputElement).value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, value);
/** Everything the page complains about. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  return problems;
}
/* a figure sleeps until its IntersectionObserver reports it on screen, and that report comes on the browser's own time */
const settle = (page: Page) => page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));

for (const [id, ex] of Object.entries(EXAMPLES)) {
  test(`${id} answers the pointer and comes back to rest, with nothing on the console`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(`/bench/${id}`);
    const stage = page.locator("#stage");
    await expect(stage.locator("svg > *").first()).toBeAttached();
    await expect(page.locator("#read")).toHaveText("rest");
    await expect(page.locator("#name")).toHaveText(id);
    await expect(page.locator("#means")).not.toBeEmpty();
    await expect(page.locator("#rules")).toHaveText(/^\d\d [a-z]+( · \d\d [a-z]+)*$/);
    const box = (await stage.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(5 / 4, 2);
    const rest = await svg(page);

    await page.mouse.move(box.x + (ex.at[0] / 400) * box.width, box.y + (ex.at[1] / 320) * box.height, { steps: 4 });
    await expect(page.locator("#read")).not.toHaveText("rest");
    await expect.poll(() => svg(page)).not.toBe(rest);

    await page.mouse.move(2, 2);
    await expect(page.locator("#read")).toHaveText("rest");
    await expect.poll(() => svg(page), { timeout: 8000 }).toBe(rest);
    expect(problems).toEqual([]);
  });

  test(`${id}: the slider reaches the figure`, async ({ context, page }) => {
    await context.addInitScript(clock);
    const drawn = async (value: number) => {
      await page.goto(`/bench/${id}`);
      await page.locator("#stage svg > *").first().waitFor();
      await settle(page);
      const [cp] = await play(page, {
        stage: page.locator("#stage"),
        snap: async () => ({ svg: await svg(page), read: await read(page) }),
        set: () => setIntensity(page, value),
      }, [{ set: true }, { move: ex.at }, { adv: 12 }, { cp: "answering" }]) as Checkpoint[];
      return { svg: cp.svg, value: await page.locator("#value").innerText() };
    };
    const low = await drawn(0), high = await drawn(1);
    expect([low.value, high.value]).toEqual(ex.ends);
    expect(low.svg).not.toBe(high.svg);
  });

  test(`${id} on the bench draws what the package draws`, async ({ context, page }) => {
    const golden = (JSON.parse(file(`../parity/golden/${id}.json`)) as { checkpoints: Checkpoint[] }).checkpoints;
    /* the goldens hold Riffle's hidden hit bands and the names the site gives its cards; neither is drawn or said here */
    const strip = (s: string) => s.replace(/<g class="bands">.*?<\/g>/, "");
    const unname = (s: string) => s.replace(/ · .*$/, "");
    await context.addInitScript(clock);
    await page.goto(`/bench/${id}`);
    const stage = page.locator("#stage");
    await stage.locator("svg > *").first().waitFor();
    await settle(page);

    const got = await play(page, {
      stage,
      snap: async () => ({ svg: await svg(page), read: await read(page) }),
      set: () => setIntensity(page, (INTENSITY as Record<string, number>)[id]),
    }, ex.steps) as Checkpoint[];

    expect(got.length).toBeGreaterThanOrEqual(4);
    for (const [i, have] of got.entries()) {
      expect(have.at).toBe(golden[i].at);
      expect(have.read, `caption at "${have.at}"`).toBe(unname(golden[i].read));
      expect(strip(have.svg), `drawing at "${have.at}"`).toBe(strip(golden[i].svg));
    }
  });
}

test("the theme switch changes the palette, and wins over the system's theme both ways", async ({ page }) => {
  const stroke = () => page.locator("#stage path.sil").first().evaluate((el) => getComputedStyle(el).stroke);
  await page.goto("/bench/terrain");
  await expect.poll(stroke).toBe("rgb(164, 164, 172)");
  await expect(page.locator("#theme")).toHaveText("light");
  await page.locator("#theme").click();
  await expect.poll(stroke).toBe("rgb(91, 93, 100)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 9, 10)");
  await expect(page.locator("#theme")).toHaveText("dark");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect.poll(stroke).toBe("rgb(91, 93, 100)");
  await page.locator("#theme").click();
  await expect.poll(stroke).toBe("rgb(164, 164, 172)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("the page fits a 240px screen without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 700 });
  await page.goto("/bench/terrain");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
  expect((await page.locator("#stage").boundingBox())!.width).toBeGreaterThan(180);
});

test("destroy leaves the svg empty", async ({ page }) => {
  await page.goto("/bench/terrain");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  await page.evaluate(() => (window as unknown as { hairline: { figure: { destroy(): void } } }).hairline.figure.destroy());
  expect(await page.locator("#stage > svg").evaluate((el) => el.childElementCount)).toBe(0);
});

test("a figure that throws says so under the stage", async ({ page }) => {
  await page.goto("/bench/throws");
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator("#error")).toContainText("no drawing today");
});

test("the built file draws when opened from disk, narrowed and with the pointer held by its URL", async ({ page }) => {
  const problems = watch(page);
  const out = join(mkdtempSync(join(tmpdir(), "hl-page-")), "hairline-terrain.html");
  execFileSync("node", [SKILL + "build.mjs", SKILL + "examples/terrain.js", out]);
  await page.goto(pathToFileURL(out).href + "?w=240&at=200,160");
  await expect(page.locator("#stage svg > *").first()).toBeAttached();
  await expect(page.locator("#read")).toHaveText(/^cell \d·\d$/);
  expect((await page.locator("#stage").boundingBox())!.width).toBeLessThanOrEqual(240);
  await expect(page).toHaveTitle("Hairline · terrain");
  expect(problems).toEqual([]);
});
