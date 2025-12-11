import { readdirSync } from "node:fs";

const topComment =
	"// This file is auto-generated. Do not edit directly. Run npm run generate-tools-index to update.\n\n";

export default function generateIndex(fp: string) {
	const files = readdirSync(fp)
		.filter(
			(f) =>
				f.endsWith(".ts") &&
				f !== "index.ts" &&
				!f.endsWith(".d.ts") &&
				!f.endsWith(".test.ts")
		)
		.sort((a, b) => a.localeCompare(b));
	return `${topComment + files.map((f) => `import "./${f.replace(/\.ts$/, "")}";`).join("\n")}\n`;
}
