import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import generateIndex from "./bootstrapping/utils/generateIndex";

test("index file is up to date", () => {
	const generated = generateIndex(__dirname);
	const existing = readFileSync(`${__dirname}/index.ts`, "utf-8");
	if (generated !== existing) {
		console.log(
			"Generated index.ts is out of date. Please run `npm run generate-resources-index` to update it."
		);
	}
	expect(existing).toBe(generated);
});
