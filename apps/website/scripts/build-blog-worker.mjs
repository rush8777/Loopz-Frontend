import { fileURLToPath } from "node:url";
import { build } from "esbuild";

await build({
  entryPoints: [fileURLToPath(new URL("../src/blog/handler.mjs", import.meta.url))],
  outfile: fileURLToPath(new URL("../dist/_worker.js", import.meta.url)),
  bundle: true,
  format: "esm",
  platform: "browser",
  conditions: ["workerd", "worker", "browser"],
  define: { "process.env.NODE_ENV": '"production"' },
  target: "es2022",
  minify: true,
  legalComments: "inline",
});
