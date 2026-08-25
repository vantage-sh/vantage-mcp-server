import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
  },
});
