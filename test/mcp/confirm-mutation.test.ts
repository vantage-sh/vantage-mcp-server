import type { ServerContext } from "@modelcontextprotocol/server";
import { afterEach, expect, it, vi } from "vitest";
import { createMutationConfirmation } from "../../src/mcp/confirm-mutation";
import { parseConfirmationPolicy } from "../../src/mcp/confirmation-policy";

afterEach(() => vi.restoreAllMocks());
const tool = { name: "delete-folder", title: "Delete Folder" };
const args = { folder_token: "fldr_target" };
const key = "test-only-key-with-at-least-32-bytes";
const context = () =>
  ({
    mcpReq: { method: "tools/call", signal: new AbortController().signal, requestState: () => undefined },
  }) as unknown as ServerContext;
function runtime(principal = "alice", policy = "all", ttlSeconds = 300) {
  return createMutationConfirmation({
    key,
    principal,
    policy: parseConfirmationPolicy(policy, [tool.name, "update-folder"]),
    ttlSeconds,
    clientCapabilities: () => ({ elicitation: { form: {} } }),
  });
}
async function challenge() {
  const gate = runtime();
  const ctx = context();
  const pending = (await gate.confirm(tool, args, ctx))!;
  const responseKey = Object.keys(pending.inputRequests!)[0];
  const state = await gate.serverOptions.requestState.verify(pending.requestState!, ctx);
  const retry = context();
  retry.mcpReq.requestState = () => state as never;
  return { gate, pending, responseKey, retry };
}
it("issues a pending challenge and only accepts an explicit true response", async () => {
  const { gate, responseKey, retry } = await challenge();
  retry.mcpReq.inputResponses = { [responseKey]: { action: "accept", content: { confirm: true } } };
  expect(await gate.confirm(tool, args, retry)).toBeUndefined();
});
it.each([
  { action: "decline" },
  { action: "cancel" },
  { action: "accept", content: { confirm: false } },
  { action: "accept", content: { confirm: "true" } },
  { action: "accept", content: {} },
])("refuses %j", async (response) => {
  const { gate, responseKey, retry } = await challenge();
  retry.mcpReq.inputResponses = { [responseKey]: response };
  await expect(gate.confirm(tool, args, retry)).rejects.toMatchObject({
    exception: { errors: [{ message: expect.stringContaining("not confirmed") }] },
  });
});
it("rejects changed arguments, changed tool, or acceptance without a challenge", async () => {
  const { gate, responseKey, retry } = await challenge();
  retry.mcpReq.inputResponses = { [responseKey]: { action: "accept", content: { confirm: true } } };
  for (const [changedTool, changedArgs] of [
    [tool, { folder_token: "fldr_other" }],
    [{ name: "update-folder", title: "Update Folder" }, args],
  ] as const) {
    await expect(gate.confirm(changedTool, changedArgs, retry)).rejects.toMatchObject({
      exception: { errors: [{ message: expect.stringContaining("does not match") }] },
    });
  }
  const forged = context();
  forged.mcpReq.inputResponses = retry.mcpReq.inputResponses;
  await expect(gate.confirm(tool, args, forged)).rejects.toMatchObject({
    exception: { errors: [{ message: expect.stringContaining("does not match") }] },
  });
});
it("rejects tampered, expired, cross-principal, and cross-policy signed state", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1000000);
  const gate = runtime("alice", "all", 1);
  const pending = (await gate.confirm(tool, args, context()))!;
  await expect(gate.serverOptions.requestState.verify(`${pending.requestState}x`, context())).rejects.toThrow();
  await expect(runtime("bob").serverOptions.requestState.verify(pending.requestState!, context())).rejects.toThrow();
  await expect(
    runtime("alice", "delete").serverOptions.requestState.verify(pending.requestState!, context())
  ).rejects.toThrow();
  vi.mocked(Date.now).mockReturnValue(1002000);
  await expect(gate.serverOptions.requestState.verify(pending.requestState!, context())).rejects.toThrow();
});
it("refuses unsupported elicitation and honours cancellation", async () => {
  const gate = createMutationConfirmation({
    key,
    principal: "alice",
    policy: parseConfirmationPolicy("all", [tool.name]),
    clientCapabilities: () => ({}),
  });
  await expect(gate.confirm(tool, args, context())).rejects.toMatchObject({
    exception: { errors: [{ message: expect.stringContaining("supports confirmations") }] },
  });
  const ctx = context();
  ctx.mcpReq.signal = AbortSignal.abort(new Error("cancelled"));
  await expect(runtime().confirm(tool, args, ctx)).rejects.toThrow("cancelled");
});
it("redacts credential values in prompts and carries only argument hashes in state", async () => {
  const pending = (await runtime().confirm(
    tool,
    { ...args, password: "never-show-this", credential: "never-show-this", comment: "vntg_tkn_never-show" },
    context()
  ))!;
  expect(JSON.stringify(pending)).not.toContain("never-show");
  expect(JSON.stringify(pending)).toContain("[redacted]");
  expect(JSON.stringify(pending)).toContain("fldr_target");
  const state = await runtime().serverOptions.requestState.verify(pending.requestState!, context());
  expect(state.argsHash).toHaveLength(64);
  expect(JSON.stringify(state)).not.toContain("fldr_target");
});
it("skips unselected operations and rejects oversized confirmation previews", async () => {
  expect(await runtime("alice", "none").confirm(tool, args, context())).toBeUndefined();
  await expect(runtime().confirm(tool, { text: "a".repeat(12001) }, context())).rejects.toMatchObject({
    exception: { errors: [{ message: expect.stringContaining("too large") }] },
  });
});
