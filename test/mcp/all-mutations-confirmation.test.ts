import { inputRequired } from "@modelcontextprotocol/server";
import { expect, it, vi } from "vitest";
import { mutationOperation } from "../../src/mcp/confirmation-policy";
import { getRegisteredToolNames, setupRegisteredTools } from "../../src/tools/structure/registerTool";
import "../../src/tools";

it("gates every registered create/update/delete before execution, regardless of annotation drift", async () => {
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
  const confirmMutation = vi.fn(async () => pending);
  const callVantageApi = vi.fn(async () => ({ ok: false as const, errors: [] }));
  setupRegisteredTools(server, () => ({ confirmMutation, callVantageApi }));
  const names = getRegisteredToolNames().filter(mutationOperation);
  expect(names.length).toBeGreaterThan(60);
  for (const name of names) expect(await handlers.get(name)!({}, {})).toBe(pending);
  expect(confirmMutation).toHaveBeenCalledTimes(names.length);
  expect(callVantageApi).not.toHaveBeenCalled();
});
