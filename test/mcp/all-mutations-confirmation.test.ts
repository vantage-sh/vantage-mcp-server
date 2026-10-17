import { inputRequired } from "@modelcontextprotocol/server";
import { expect, it, vi } from "vitest";
import { parseConfirmationPolicy, requiresConfirmation } from "../../src/mcp/confirmation-policy";
import { getRegisteredTools, setupRegisteredTools } from "../../src/tools/structure/registerTool";
import "../../src/tools";

it("gates every registered tool that is not read-only before execution", async () => {
  const handlers = new Map<string, (args: unknown, extra: unknown) => Promise<unknown>>();
  const server = {
    registerTool: vi.fn((name, _config, callback) => {
      handlers.set(name, callback);
      return { disable: vi.fn() };
    }),
  };
  const pending = inputRequired({
    inputRequests: {
      confirm: inputRequired.elicit({
        message: "Confirm",
        requestedSchema: { type: "object", properties: { confirm: { type: "boolean" } } },
      }),
    },
  });
  const policy = parseConfirmationPolicy("all", getRegisteredTools());
  const confirmMutation = vi.fn(async (tool) => (requiresConfirmation(policy, tool) ? pending : undefined));
  const callVantageApi = vi.fn(async () => ({ ok: false as const, errors: [] }));
  setupRegisteredTools(server, () => ({ confirmMutation, callVantageApi }));
  const mutations = getRegisteredTools()
    .filter((tool) => !tool.annotations.readOnly)
    .map((tool) => tool.name);
  expect(mutations).toEqual(expect.arrayContaining(["add-team-member", "remove-team-member", "submit-user-feedback"]));
  for (const name of mutations) expect(await handlers.get(name)!({}, {})).toBe(pending);
  expect(callVantageApi).not.toHaveBeenCalled();
  const gated = getRegisteredTools()
    .filter((tool) => requiresConfirmation(policy, tool))
    .map((tool) => tool.name);
  expect(gated).toEqual(mutations);
});
