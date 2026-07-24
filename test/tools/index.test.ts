import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import generateIndex from "../../src/utils/generateIndex";

test("index file is up to date", () => {
  const generated = generateIndex(join(__dirname, "../../src/tools"));
  const existing = readFileSync(join(__dirname, "../../src/tools/index.ts"), "utf-8");
  if (generated !== existing) {
    console.log("Generated index.ts is out of date. Please run `npm run generate-tools-index` to update it.");
  }
  expect(existing).toBe(generated);
});
