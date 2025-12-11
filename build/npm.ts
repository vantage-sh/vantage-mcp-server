import { buildSync } from "esbuild";
import { chmodSync, copyFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SERVER_VERSION } from "../src/tools/structure/constants";

const packageJson = {
    name: "vantage-mcp-server",
    version: SERVER_VERSION,
    main: "index.js",
    bin: {
        "vantage-mcp-server": "index.js",
    },
    author: "Vantage",
    license: "MIT",
    repository: {
        type: "git",
        url: "git+https://github.com/vantage-sh/vantage-mcp-server.git",
    },
};

try {
    buildSync({
        entryPoints: [join(__dirname, "../src/local.ts")],
        bundle: true,
        sourcemap: true,
        minify: true,
        platform: "node",
        target: "node20",
        outfile: join(__dirname, "../local-package/index.js"),
        banner: { js: "#!/usr/bin/env node" },
    });
} catch {
    // If esbuild fails, it logs out, so just exit with error.
    process.exit(1);
}

writeFileSync(
    join(__dirname, "../local-package/package.json"),
    JSON.stringify(packageJson, null, 4) + "\n",
);

chmodSync(join(__dirname, "../local-package/index.js"), 0o755);

copyFileSync(
    join(__dirname, "../README.local.md"),
    join(__dirname, "../local-package/README.md"),
);

console.log("Generated local MCP package in ./local-package");
