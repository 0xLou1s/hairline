/**
 * The browser tests' server: the harness page and the package source, bundled
 * by esbuild at start. Playwright starts it (playwright.config.ts).
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const PORT = 4310;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const bundle = await build({ entryPoints: [here("./entry.ts")], bundle: true, format: "esm", target: "es2020", write: false });
const routes = {
  "/": ["text/html", readFileSync(here("./harness.html"))],
  "/entry.js": ["text/javascript", bundle.outputFiles[0].contents],
};

createServer((req, res) => {
  const hit = routes[new URL(req.url, "http://x").pathname];
  if (!hit) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": `${hit[0]}; charset=utf-8`, "cache-control": "no-store" }).end(hit[1]);
}).listen(PORT, () => console.log(`harness on http://localhost:${PORT}`));
