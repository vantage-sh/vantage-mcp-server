import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const topComment = `// This file is auto-generated. Do not edit directly. Run npm run generate-resources-index to update.

import wrapMap from "./bootstrapping/utils/wrapMap";

export default wrapMap(new Map([
`;

function handleQuotes(s: string) {
	try {
		return JSON.parse(s).toString();
	} catch {
		return s.trim();
	}
}

function checkFrontmatter(content: string): [string, string | null, string | null] {
	const frontmatter = content.match(/^---\n(.*?)\n---\n/s);
	if (frontmatter) {
		// Try to find a description field
		const description = frontmatter[1].match(/^description: (.*)$/m);
		const descriptionParsed = description ? handleQuotes(description[1]) : null;
		const title = frontmatter[1].match(/^title: (.*)$/m);
		const titleParsed = title ? handleQuotes(title[1]) : null;
		return [content.substring(frontmatter[0].length), titleParsed, descriptionParsed];
	}
	return [content, null, null];
}

function generateChunk(fp: string, prefix: string) {
	const files = readdirSync(fp).sort((a, b) => a.localeCompare(b));

	let v = "";
	for (const file of files) {
		const stats = statSync(resolve(fp, file));
		if (stats.isDirectory()) {
			v += generateChunk(resolve(fp, file), `${prefix}${file}/`);
		} else if (file.endsWith(".md") && file !== "README.md") {
			const rawContent = readFileSync(resolve(fp, file), "utf8");
			const [content, title, description] = checkFrontmatter(rawContent);
			v += `    [
        "${prefix}${file}",
        {
            content: \`${content.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\`,
            description: ${description ? JSON.stringify(description) : "undefined"},
            title: ${title ? JSON.stringify(title) : "undefined"},
        },
    ],
`;
		}
	}
	return v;
}

export default function generateIndex(fp: string) {
	return `${topComment}${generateChunk(fp, "")}]));\n`;
}
