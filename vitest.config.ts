import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "cloudflare:workers": fileURLToPath(new URL("./test/mocks/cloudflare-workers.ts", import.meta.url)),
    },
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    server: {
      deps: { inline: ["@cloudflare/workers-oauth-provider"] },
    },
  },
});
