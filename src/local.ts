import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createMutationConfirmation } from "./mcp/confirm-mutation";
import { parseConfirmationPolicy } from "./mcp/confirmation-policy";
import setupRegisteredResources from "./resources";
import { callApi, serverMeta } from "./shared";
import { hideAccessPolicyToolsFromNonOwners } from "./tools/access-policies/gating";
import { getRegisteredToolNames, setupRegisteredTools, type ToolCallContext } from "./tools/structure/registerTool";

// Side effect import to register all tools
import "./tools";

async function main() {
  if (!process.env.VANTAGE_TOKEN) {
    throw new Error("VANTAGE_TOKEN environment variable is required.");
  }

  const policy = parseConfirmationPolicy(process.env.VANTAGE_MCP_CONFIRM, getRegisteredToolNames());
  const confirmationKey = crypto.getRandomValues(new Uint8Array(32));
  serveStdio(
    async () => {
      const confirmation = policy.selectors.size
        ? createMutationConfirmation({
            policy,
            key: confirmationKey,
            principal: "local-stdio",
            clientCapabilities: () => server.server.getClientCapabilities(),
          })
        : undefined;
      const server: McpServer = new McpServer(serverMeta, confirmation?.serverOptions);
      const ctx: ToolCallContext = {
        confirmMutation: confirmation?.confirm,
        callVantageApi: async (endpoint, params, method, signal) => {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${process.env.VANTAGE_TOKEN}`,
          };

          return callApi(
            process.env.VANTAGE_API_HOST || "https://api.vantage.sh",
            headers,
            params,
            method,
            endpoint,
            undefined,
            signal
          );
        },
      };

      const tools = setupRegisteredTools(server, () => ctx);
      setupRegisteredResources(server);
      await hideAccessPolicyToolsFromNonOwners(tools, ctx);

      return server;
    },
    { onerror: (error) => console.error(error) }
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
