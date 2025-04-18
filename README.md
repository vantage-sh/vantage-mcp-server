<div align="center">

# Vantage MCP Server

<h4>Use natural language to explore your organization’s cloud costs via MCP clients, like Claude, Cursor, and others. Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more.</h4>

<img src="static/img/MCP.png" alt="image" width="600" height="auto">

</div>

## About the Vantage MCP Server

The Vantage MCP Server is an open-source tool, written in Golang, that lets you interact with your cloud cost data through AI assistants and MCP clients. By acting as a bridge to Vantage's existing APIs, the Vantage MCP Server lets you query cloud spend data using natural language and makes cost analysis more intuitive.

> 📝 _Note: At this time, the Vantage MCP Server is available only as a locally run service using [Standard Input/Output (stdio) Transport](https://modelcontextprotocol.io/docs/concepts/transports#standard-input%2Foutput-stdio), meaning it must be executed on your machine or server and integrated with an MCP client._

### Available Tools

The Vantage MCP Server currently exposes the following tools, which can be invoked by any compatible MCP client (e.g., Claude, Cursor):

- `get-costs`

  - Allows filtering costs by date and VQL.

- `list-cost-reports`

  - List all cost reports available.

- `list-cost-integrations`

  - List all cost provider integrations (e.g., AWS, Azure, GCP) available to provide costs data from and their associated accounts.

- `list-tags`

  - List tags that can be used to filter cost reports.

- `list-tag-values`

  - List tag values that can be used to filter cost reports.

- `list-anomalies`
  - List anomalies that were detected on cost reports.

## Getting Started

### Prerequisites

Ensure the following packages are installed (see `.tool-versions` for exact versions):

- [Go](https://go.dev/doc/install)
- [Node.js](https://nodejs.org/en/download)

You can use a version manager (e.g., [`asdf`](https://asdf-vm.com/)) or package manager (e.g., [Homebrew](https://brew.sh/)) to install these dependencies.

You will also need to create a **Read** Vantage API token (Write will not work at this time). Follow the instructions on the [Vantage API documentation](https://vantage.readme.io/reference/authentication).

### Installation

1. Clone this repository.

```bash
git clone https://github.com/vantage-sh/vantage-mcp-server
```

2. Build the server and adjust permissions.

```bash
go build -o vantage-mcp-server
chmod +x vantage-mcp-server
```

> 📝 _Note: If you pull down new changes from the repository, be sure to re-run `go build` to rebuild the server and ensure you're running the latest version._

3. Run using the MCP inspector.

```bash
npx @modelcontextprotocol/inspector -e VANTAGE_BEARER_TOKEN=<token> ./vantage-mcp-server
```

### Set Up MCP Clients

Setup instructions vary depending on which MCP client you use. Example clients include:

- [Claude for Desktop](https://modelcontextprotocol.io/quickstart/user)
- [Cursor](https://docs.cursor.com/context/model-context-protocol)

See the [MCP documentation](https://modelcontextprotocol.io/clients) for a list of available clients. Detailed instructions for Claude for Desktop are provided below.

#### Claude for Desktop

1. Download [Claude for Desktop](https://claude.ai/download).
2. From the top of Claude for Desktop, click **Claude > Settings** (keyboard shortcut `Command + ,`).
3. In the left menu of the Settings pane, select **Developer**.
4. Click **Edit Config**. A configuration file is created at:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

5. Open the `claude_desktop_config.json` file and update its contents. Make sure to replace the placeholders `<path_to_compiled_vantage_mcp_server_binary>` with the path where you downloaded the Vantage MCP Server binary, and `<personal_vantage_api_token>` with your Vantage API token.

   ```json
   {
     "mcpServers": {
       "Vantage": {
         "command": "<path_to_compiled_vantage_mcp_server_binary>",
         "args": [],
         "env": { "VANTAGE_BEARER_TOKEN": "<personal_vantage_api_token>" }
       }
     }
   }
   ```

6. Save the configuration file and restart Claude.
7. In the bottom-right corner of the Claude for Desktop input box, click the hammer icon to see the available tools for the Vantage MCP Server.
8. Once you've set up the configuration, you can start prompting Claude. Each time you use a new tool, Claude will ask for your approval before proceeding.

## Contribution Guidelines

If you'd like to contribute to this project:

1. Fork this repository.
2. Create a new branch: `git checkout -b feature/my-feature`.
3. Make your changes.
4. Ensure your code is formatted and builds cleanly.
5. Submit a [pull request](https://github.com/vantage-sh/vantage-mcp-server/pulls).

We welcome community contributions, improvements, and bug fixes. If you run into any issues, submit a bug report via this repository's [GitHub Issues](https://github.com/vantage-sh/vantage-mcp-server/issues).

## License

See the `LICENSE.MD` file for commercial and non-commercial licensing details.
