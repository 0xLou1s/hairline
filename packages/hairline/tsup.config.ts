import { defineConfig } from "tsup";

export default defineConfig([{ format: ["esm"], target: "es2020", dts: true, sourcemap: true, entry: ["src/index.ts"] }]);
