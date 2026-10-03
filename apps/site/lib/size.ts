import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * The vanilla entry's gzip size with every figure, as the Tiny card says
 * it: "16.3 kB". Measured at build from the package's own dist, which turbo
 * builds before the site. Next runs the build from apps/site.
 */
export function tiny(): string {
  const file = readFileSync(join(process.cwd(), "../../packages/hairline/dist/index.js"));
  return `${(gzipSync(file).length / 1000).toFixed(1)} kB`;
}
