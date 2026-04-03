import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const topComment =
	"// This file is auto-generated. Do not edit directly. Run npm run generate-tools-index to update.\n\n";

export default function generateIndex(fp: string) {
	const entries = readdirSync(fp).sort((a, b) => a.localeCompare(b));

	const files = entries.filter(
		(f) =>
			f.endsWith(".ts") && f !== "index.ts" && !f.endsWith(".d.ts") && !f.endsWith(".test.ts")
	);

	const subdirs = entries.filter((f) => {
		const full = join(fp, f);
		return statSync(full).isDirectory() && readdirSync(full).includes("index.ts");
	});

	const imports = [...subdirs, ...files]
		.sort((a, b) => a.localeCompare(b))
		.map((f) => `import "./${f.replace(/\.ts$/, "")}";`);
	return `${topComment + imports.join("\n")}\n`;
}
