<div align="center">

# Vantage MCP Server

<h4>Use natural language to explore your organization's cloud costs via MCP clients, like Claude, Cursor, and others. Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more.</h4>

<img src="static/img/mcp.png" alt="MCP Logo" width="600" height="auto">

</div>

## About the Vantage MCP Server

This repository supports two different deployment modes for the Vantage MCP Server:

- Self-Hosted (Local) Mode: via `src/local.ts`
   - Runs locally using [Standard Input/Output (stdio) Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#standard-input%2Foutput-stdio)
   - Direct communication with MCP clients
   - Requires a Vantage API token
   - Best for individual users, development, or when you want full control

- Remote (HTTP) Mode: via `src/cf-worker.ts`
   - Runs as a **Cloudflare Worker** with HTTP endpoints
   - Supports multiple authentication methods (OAuth, API tokens, Vantage headers)
   - Accessible via web requests
   - Best for teams, production deployments, or when you need web-based access
   > 📝 _Note: For using the remote HTTP version in a non-development workflow, see the [Vantage MCP documentation](https://docs.vantage.sh/vantage_mcp)._

## Available Tools

The Vantage MCP Server exposes a set of tools for listing, querying, and creating Vantage resources. These tools can be invoked by any compatible MCP client and are available in [/src/tools](/src/tools).

## Get Started

### Prerequisites

- [Node.js (v18 or higher)](https://nodejs.org/en/download) and [npm](https://www.npmjs.com/) installed
- Access to an MCP-compatible client (such as Claude Desktop, Cursor, or Goose)
- A [Vantage account](https://console.vantage.sh/) with at least one [connected provider](https://docs.vantage.sh/getting_started) (AWS, Azure, Google Cloud, etc.)

### Installation

1. Clone this repo and install dependencies:

   ```bash
   git clone https://github.com/vantage-sh/vantage-mcp-server
   cd vantage-mcp-server
   npm install
   ```

2. Create a Vantage API token following the [Vantage documentation](https://docs.vantage.sh/vantage_account#create-an-api-token).

## Run the MCP Server: Self-Hosted (Local) Mode

> 📝 _Note: This self-hosted mode is intended for developing and contributing to the MCP server. For personal use, the recommended approach is to use `npx -y vantage-mcp-server`._

To use the self-hosted MCP server, you'll need to configure your MCP client to launch the server. The configuration process varies depending on which MCP client you use. Example clients include:

- [Claude for Desktop](https://modelcontextprotocol.io/quickstart/user)
- [Cursor](https://docs.cursor.com/context/model-context-protocol)
- [Goose](https://block.github.io/goose/)

See the [MCP documentation](https://modelcontextprotocol.io/clients) for a list of available clients. Detailed instructions for Claude for Desktop, Cursor, and Goose are provided below.

#### Claude for Desktop

1. Download [Claude for Desktop](https://claude.ai/download).
2. From the top of Claude for Desktop, click **Claude > Settings** (keyboard shortcut `Command + ,`).
3. In the left menu of the Settings pane, select **Developer**.
4. Click **Edit Config**. A configuration file is created at:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

5. Open the `claude_desktop_config.json` file and update its contents. Replace the placeholders `<path_to_repository>` with the path where you cloned this repository, and `<personal_vantage_api_token>` with your Vantage API token.

   ```json
   {
     "mcpServers": {
       "Vantage": {
         "command": "npx",
         "args": ["tsx", "<path_to_repository>/src/local.ts"],
         "env": { "VANTAGE_TOKEN": "<personal_vantage_api_token>" }
       }
     }
   }
   ```
   
   > 📝 _Note: The server uses `tsx` to run TypeScript directly. If you have `tsx` installed globally, you can use `"command": "tsx"` and `"args": ["<path_to_repository>/src/local.ts"]` instead._

6. Save the configuration file and restart Claude.
7. In the left corner of the Claude for Desktop input box, click the **Search and tools** icon to see the available tools for the Vantage MCP Server.
8. Once you've set up the configuration, you can start prompting Claude. Each time you use a new tool, Claude will ask for your approval before proceeding.

#### Cursor

1. Download [Cursor](https://www.cursor.com).
2. Open Cursor and click **Cursor > Settings > Cursor Settings** from the menu bar.
3. In the left pane, select **Tools & MCP**.
4. Click **New MCP Server**.
5. Update the contents of the opened `mcp.json` file. Make sure to replace the placeholders `<path_to_repository>` with the path where you cloned this repository, and `<personal_vantage_api_token>` with your Vantage API token.

   ```json
   {
     "mcpServers": {
       "Vantage": {
         "command": "npx",
         "args": ["tsx", "<path_to_repository>/src/local.ts"],
         "env": { "VANTAGE_TOKEN": "<personal_vantage_api_token>" }
       }
     }
   }
   ```
   
   > 📝 _Note: The server uses `tsx` to run TypeScript directly. If you have `tsx` installed globally, you can use `"command": "tsx"` and `"args": ["<path_to_repository>/src/local.ts"]` instead._
6. Save the configuration file. 
7. You will see the Vantage MCP Server with tools enabled in the **Installed MCP Servers** list.

#### Goose

1. Download [Goose](https://block.github.io/goose/).
2. Open Goose. In the left navigation, select **Extensions**.
3. Click **Add custom extension**.
4. In the **Extension Name** field, enter `Vantage`.
5. For **Type**, select **STDIO**.
6. In the **Description** field, enter `Query costs and usage data`.
7. In the **Command** field, enter `npx tsx <path_to_repository>/src/local.ts` (replace `<path_to_repository>` with the actual path to your cloned repository).
8. In the **Environment Variables** section, add a new variable with the name `VANTAGE_TOKEN` and the value set to your Vantage API token. Next to the environment variable, click **Add**. 
9. Click **Add Extension**.

## Local Development: Run the HTTP Mode

To develop and test the HTTP/Cloudflare Worker mode locally, you can use `npm run dev`. This starts a local development server using Wrangler.

### Bypass OAuth for Local Development

For easier local development, you can configure the `VANTAGE_MCP_TOKEN` environment variable in `wrangler-DEV.jsonc` to bypass OAuth authentication. When set, the server will use this token directly instead of requiring OAuth flow.

1. Open `wrangler-DEV.jsonc` and set the `VANTAGE_MCP_TOKEN` value in the `vars` section:

   ```jsonc
   {
     "vars": {
       "VANTAGE_MCP_TOKEN": "your_vantage_api_token_here",
       // ... other vars
     }
   }
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. The server will be available at `http://localhost:8787` (Wrangler's default port, as configured in `wrangler-DEV.jsonc`) and will bypass OAuth, using the `VANTAGE_MCP_TOKEN` for authentication instead.

> 📝 _Note: Setting `VANTAGE_MCP_TOKEN` enables direct token mode, which bypasses OAuth entirely. This is useful for local development or for MCP clients without OAuth support or the ability to pass headers._

## Local Development: Adding New Tools

To add a new tool to the application, create a file at `src/tools/<tool-name>.ts`, and use the following structure:

```typescript
import registerTool from "./structure/registerTool";
import MCPUserError from "./structure/MCPUserError";
import z from "zod";

const description = `
Your description here.
`.trim();

const args = {
    exampleArg: z.string(),
};

export default registerTool({
    name: "my-tool-name", // replace with the tool name
    description,
    async execute(args, ctx) {
        // args will be a resolved version of the schema
        console.log(args);

        if (args.exampleArg === "something") {
            // We throw a MCPUserError to send a message to the user
            // The argument is the body
            throw new MCPUserError({ my: "error" });
        }

        // ctx is a ToolCallContext, this has the function to call the vantage api

        // Then we just return
        return { a: "b" };
    },
});
```

_**Important:** When you add or remove a tool, run `npm run generate-tools-index` to update the tools index._

## Available Scripts

- `npm run dev` - Start development server with Wrangler DEV config
- `npm run local` - Run local stdio MCP server (uses tsx for TypeScript support)
- `npm run --silent local` - Run local MCP server with reduced output (recommended for development)
- `npm run inspect` - Launch MCP inspector tool
- `npm run format` - Format code using Biome
- `npm run lint:fix` - Lint and auto-fix issues with Biome  
- `npm run type-check` - Run TypeScript type checking
- `npm run cf-typegen` - Generate Cloudflare Worker types
- `npm run generate-tools-index` - Generate tools index after adding/removing tools

## Public Assets

The `/public` folder is publicly accessible. Any file like `/public/asset.gif` is accessible as `/asset.gif` when running locally or on Cloudflare.

## Contribution Guidelines

If you'd like to contribute to this project:

1. Fork this repository.
2. Create a new branch: `git checkout -b feature/my-feature`.
3. Make your changes.
4. Ensure your code is formatted and builds cleanly:
   ```bash
   npm run format
   npm run lint:fix
   npm run type-check
   ```
5. Submit a [pull request](https://github.com/vantage-sh/vantage-mcp-server/pulls).

We welcome community contributions, improvements, and bug fixes.

## License

See the `LICENSE.md` file for commercial and non-commercial licensing details.
