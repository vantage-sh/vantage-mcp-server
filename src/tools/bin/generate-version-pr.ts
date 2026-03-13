import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { spawnSync } from "child_process";
import { buildSync } from "esbuild";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { serverMeta } from "../../shared";
import { setupRegisteredTools } from "../structure/registerTool";

// Side affect import for the tools in this branch
import "..";

function runCommandAndPipeToUser(command: string, args: string[], allowError: boolean) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: "inherit",
	});
	if (result.error || result.status !== 0) {
		console.error(`Command failed: ${command} ${args.join(" ")}`);
		if (!allowError) {
			process.exit(1);
		}
	}
}

function runCommandAndGetOutput(command: string, args: string[], exitOnError: boolean) {
	const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
	if (result.error || result.status !== 0) {
		console.error(`Command failed: ${command} ${args.join(" ")}`);
		if (exitOnError) {
			process.exit(1);
		}
		return "";
	}
	return result.stdout?.toString() ?? "";
}

// Check if the current version is a git tag
const versionTagExists =
	runCommandAndGetOutput("git", ["tag", "-l", `v${serverMeta.version}`], true).trim().length > 0;
if (!versionTagExists) {
	console.log(
		`Version tag v${serverMeta.version} does not exist - not going to try and version bump and deleting automated-bump branch if it exists`
	);
	runCommandAndPipeToUser("git", ["branch", "-D", "automated-bump"], true);
	runCommandAndPipeToUser("git", ["push", "origin", "--delete", "automated-bump"], true);
	process.exit(0);
}

// Make a MCP server for the current branch
const mainServer = new McpServer(serverMeta);
setupRegisteredTools(mainServer, () => ({
	callVantageApi() {
		return Promise.reject(new Error("Not implemented"));
	},
}));

// Change to this version branch
runCommandAndPipeToUser("git", ["checkout", `v${serverMeta.version}`], false);

// Here comes the fun bit! We want to get a server within the tag context, BUT we do not want to change this context.
// To do this, we build a script that does the same init above then bundle it. This way, it has its own context.
const exportScript = `import "../src/tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupRegisteredTools } from "../src/tools/structure/registerTool";
import { serverMeta } from "../src/shared";

const server = new McpServer(serverMeta);
setupRegisteredTools(server, () => ({
    callVantageApi() {
        return Promise.reject(new Error("Not implemented"));
    }
}));

export default server;
`;
const root = join(__dirname, "..", "..", "..");
const tmpFile = join(root, "node_modules", "tag-out.mjs");
const outTmpFile = join(root, "node_modules", "tag-out-bundle.mjs");
writeFileSync(tmpFile, exportScript);

try {
	buildSync({
		entryPoints: [tmpFile],
		bundle: true,
		sourcemap: true,
		minify: true,
		platform: "node",
		target: "node20",
		outfile: outTmpFile,
	});
	unlinkSync(tmpFile);
} catch {
	// If esbuild fails, it logs out, so just exit with error.
	unlinkSync(tmpFile);
	process.exit(1);
}

// Load this bundle here
let tagServer: McpServer;
try {
	tagServer = require(outTmpFile).default;
} finally {
	unlinkSync(outTmpFile);
}

// Switch back to main
runCommandAndPipeToUser("git", ["checkout", "main"], false);

function zodStringify(schema: any): string {
	if (!schema) {
		return "undefined";
	}
	return JSON.stringify(schema);
}

function checkIfChanges(tagTool: Tool, mainTool: Tool): boolean {
	if (tagTool.description !== mainTool.description) {
		return true;
	}
	if (JSON.stringify(tagTool.annotations) !== JSON.stringify(mainTool.annotations)) {
		return true;
	}
	if (
		zodStringify(tagTool.inputSchema) !== zodStringify(mainTool.inputSchema) ||
		zodStringify(tagTool.outputSchema) !== zodStringify(mainTool.outputSchema)
	) {
		return true;
	}
	return false;
}

function getToolStructureChanges(tagTools: Tool[], mainTools: Tool[]): string[] {
	const mainSet = new Set(mainTools.map((tool) => tool.name));

	const changes: string[] = [];
	for (const tool of mainTools) {
		const tagTool = tagTools.find((t) => t.name === tool.name);
		if (tagTool) {
			const changed = checkIfChanges(tagTool, tool);
			if (changed) {
				changes.push(`- Updated tool: ${tool.name}`);
			}
		} else {
			changes.push(`- Created tool: ${tool.name}`);
		}
	}

	for (const tool of tagTools) {
		if (!mainSet.has(tool.name)) {
			changes.push(`- Removed tool: ${tool.name}`);
		}
	}

	return changes;
}

const constantsPath = join(__dirname, "..", "structure", "constants.ts");

async function doPr(description: string, newVersion: string) {
	// If the branch exists, check if the diff is the same as the version bump
	const title = `chore: Bump version to ${newVersion}.`;
	const lastCommitToAutomated = runCommandAndGetOutput(
		"git",
		["log", "-1", "--pretty=%B", "automated-bump"],
		false
	);
	if (lastCommitToAutomated.includes(title) && lastCommitToAutomated.includes(description)) {
		console.log("Last commit to automated-bump is the same as the version bump, skipping PR");
		return;
	}

	// Delete the branch if it exists
	runCommandAndPipeToUser("git", ["branch", "-D", "automated-bump"], true);

	if (process.env.DRY_RUN !== "true") {
		// Push the branch deletion to the remote repository so that the PR is closed if it exists
		runCommandAndPipeToUser("git", ["push", "origin", "--delete", "automated-bump"], true);
	}

	// Create and switch to the new branch
	runCommandAndPipeToUser("git", ["checkout", "-b", "automated-bump"], false);

	// Change the version in the constants file
	const constants = readFileSync(constantsPath, "utf8");
	const newConstants = constants.replace(serverMeta.version, newVersion);
	writeFileSync(constantsPath, newConstants);

	// Commit the changes
	runCommandAndPipeToUser("git", ["add", constantsPath], false);
	runCommandAndPipeToUser("git", ["commit", "-m", title, "-m", description], false);

	// Push the branch
	if (process.env.DRY_RUN !== "true") {
		runCommandAndPipeToUser("git", ["push", "origin", "--force", "automated-bump"], false);
	}

	// Create or update the PR
	if (process.env.DRY_RUN === "true") {
		console.log("Dry run, skipping PR creation");
		return;
	}
	runCommandAndPipeToUser(
		"gh",
		[
			"pr",
			"create",
			"--repo",
			"vantage-sh/vantage-mcp-server",
			"--title",
			title,
			"--body",
			description,
			"--base",
			"main",
			"--head",
			"automated-bump",
		],
		false
	);
	console.log("PR created successfully");
}

(async () => {
	// Get the current branch's tools
	const [clientTagTransport, serverTagTransport] = InMemoryTransport.createLinkedPair();
	await tagServer.connect(serverTagTransport);
	const tagClient = new Client(serverMeta);
	await tagClient.connect(clientTagTransport);
	const tagTools = await tagClient.listTools();

	// Close the server
	await tagClient.close();
	await tagServer.close();

	// Now do the same for the main branch
	const [clientMainTransport, serverMainTransport] = InMemoryTransport.createLinkedPair();
	await mainServer.connect(serverMainTransport);
	const mainClient = new Client(serverMeta);
	await mainClient.connect(clientMainTransport);
	const mainTools = await mainClient.listTools();

	// Close the client and server
	await mainClient.close();
	await mainServer.close();

	// Compare the tools
	const toolChanges = getToolStructureChanges(tagTools.tools, mainTools.tools);
	const parts = serverMeta.version.split(".");
	if (toolChanges.length === 0) {
		// Patch version bump
		parts[2] = (parseInt(parts[2]) + 1).toString();
		const newVersion = parts.join(".");
		await doPr("No tool changes, bumping patch version", newVersion);
		return;
	}

	// Minor version bump
	parts[1] = (parseInt(parts[1]) + 1).toString();
	parts[2] = "0";
	const newVersion = parts.join(".");
	await doPr(`Tool changes:\n${toolChanges.join("\n")}`, newVersion);
})();
