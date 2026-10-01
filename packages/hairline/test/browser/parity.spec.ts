import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { play } from "../parity/driver.mjs";
import { FIGURES, OPTION, SCRIPTS } from "../parity/scripts.mjs";

/**
 * The package draws what the site draws. Each golden is the site's svg at
 * every checkpoint of a pointer script (test/parity/capture.mjs); the same
 * script is played here against the package, on the same virtual clock.
 */
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const clock = file("../parity/clock.js") + "\nwindow.__freeze(1000);";

/* The site names its eight cards; the package takes names as an option. */
const NAMES = ["Radial menu", "Drum", "Dock", "Condense", "Settle", "Upload", "Badge", "Spark"];

type Checkpoint = { at: string; read: string; svg: string };

for (const id of FIGURES as string[]) {
  test(`${id} draws what the site draws`, async ({ context, page }) => {
    const golden = JSON.parse(file(`../parity/golden/${id}.json`)) as { checkpoints: Checkpoint[] };
    const [key, value] = (OPTION as unknown as Record<string, [string, number]>)[id];
    await context.addInitScript(clock);
    await page.goto("/");
    await page.evaluate(([id, labels]) => { window.__hl.mount(id as "riffle", id === "riffle" ? { labels } : {}); }, [id, NAMES] as const);
    const stage = page.locator("#host");
    await stage.locator("svg > *").first().waitFor();
    /* a figure sleeps until its IntersectionObserver reports it on screen, and that report comes on the browser's own time */
    await page.evaluate(() => new Promise((done) => window.__realTimeout(done, 500)));

    const got: Checkpoint[] = await play(page, {
      stage,
      snap: () => page.evaluate(() => ({ svg: document.querySelector("#host > svg")!.innerHTML, read: window.__hl.read() })),
      set: () => page.evaluate(([key, value]) => window.__hl.figure!.update({ [key]: value }), [key, value] as const),
    }, (SCRIPTS as Record<string, object[]>)[id]);

    expect(got.map((c) => c.at)).toEqual(golden.checkpoints.map((c) => c.at));
    for (const [i, want] of golden.checkpoints.entries()) {
      expect(got[i].read, `caption at "${want.at}"`).toBe(want.read);
      expect(got[i].svg, `drawing at "${want.at}"`).toBe(want.svg);
    }
  });
}
