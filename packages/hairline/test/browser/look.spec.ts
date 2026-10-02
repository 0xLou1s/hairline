import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The skill's look.mjs, run as an agent runs it: from a working directory, on
 * the examples and on a figure that throws. Its cache is a folder holding this
 * repo's playwright-core, so nothing is installed, and it drives the same Chrome.
 */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const from = (pkg: string, at: string) => createRequire(at).resolve(pkg + "/package.json");
const CORE = dirname(from("playwright-core", from("playwright", from("@playwright/test", import.meta.url))));

const cache = mkdtempSync(join(tmpdir(), "hl-look-cache-"));
mkdirSync(join(cache, "node_modules"));
symlinkSync(CORE, join(cache, "node_modules", "playwright-core"), "dir");

type Run = { code: number; out: string };
/** look.mjs with these arguments, in a fresh working directory. */
function look(cwd: string, ...args: string[]): Promise<Run> {
  return new Promise((done) => {
    execFile("node", [SKILL + "look.mjs", ...args], { cwd, env: { ...process.env, HAIRLINE_LOOK_CACHE: cache }, timeout: 50_000 }, (err, stdout, stderr) => {
      done({ code: err ? (typeof err.code === "number" ? err.code : -1) : 0, out: stdout + stderr });
    });
  });
}
const PNG = "89504e470d0a1a0a";

test.describe("look.mjs", () => {
  test.setTimeout(60_000);

  for (const [name, answer, read] of [["terrain", "30,90,0", "cell 2·6"], ["riffle", "42,28,52", "05"]]) {
    test(`passes ${name}, writes its sheet and prints the read-outs`, async () => {
      const cwd = mkdtempSync(join(tmpdir(), "hl-look-"));
      const run = await look(cwd, `${SKILL}examples/${name}.js`, "--answer", answer, "--zoom", "answer");
      expect(run.code, run.out).toBe(0);
      expect(run.out).toMatch(new RegExp(`^answer ${answer} -> at=\\d+,\\d+$`, "m"));
      expect(run.out).toMatch(/^9 frame: ok\. /m);
      expect(run.out).toMatch(/^8 read-out: ok\. rest "rest", answer "/m);
      expect(run.out).toContain(`answer "${read}"`);
      expect(run.out).toMatch(/^12 console: ok\. /m);
      /* 4 is information: a busy machine can say moving, so only its shape is held */
      expect(run.out).toMatch(/^4 flicker: (still|moving)\. .* Information, not a check: look\.md, item 4\.$/m);
      for (const png of [`hairline-${name}-look.png`, `hairline-${name}-answer.png`]) {
        expect(existsSync(join(cwd, png)), png).toBe(true);
        expect(readFileSync(join(cwd, png)).subarray(0, 8).toString("hex"), png).toBe(PNG);
      }
    });
  }

  test("fails a figure that throws when it mounts", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "hl-look-"));
    const src = readFileSync(SKILL + "examples/terrain.js", "utf8").replace(/^(function mount\(.*\{)$/m, '$1\n  throw new Error("no drawing today");');
    expect(src).toContain("no drawing today");
    writeFileSync(join(cwd, "terrain.js"), src);
    const run = await look(cwd, "terrain.js", "--answer", "30,90,0");
    expect(run.code, run.out).toBe(1);
    expect(run.out).toMatch(/^12 console: fail/m);
    expect(run.out).toContain("no drawing today");
  });
});
