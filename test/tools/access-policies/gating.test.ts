import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_POLICY_TOOL_NAMES,
  hideAccessPolicyToolsFromNonOwners,
} from "../../../src/tools/access-policies/gating";
import type { ToolCallContext } from "../../../src/tools/structure/registerTool";

function toolsWithSpies() {
  const disable = vi.fn();
  const tools = new Map<string, RegisteredTool>();
  for (const name of [...ACCESS_POLICY_TOOL_NAMES, "list-budgets"]) {
    tools.set(name, { disable } as unknown as RegisteredTool);
  }
  return { tools, disable };
}

function contextReturning(result: Awaited<ReturnType<ToolCallContext["callVantageApi"]>>) {
  const callVantageApi = vi.fn().mockResolvedValue(result);
  return { ctx: { callVantageApi } as unknown as ToolCallContext, callVantageApi };
}

describe("hideAccessPolicyToolsFromNonOwners", () => {
  it("hides the Access Policy tools when the caller is not an account owner", async () => {
    const { tools, disable } = toolsWithSpies();
    const { ctx, callVantageApi } = contextReturning({
      ok: true,
      data: { is_account_owner: false } as never,
    });

    await hideAccessPolicyToolsFromNonOwners(tools, ctx);

    expect(callVantageApi).toHaveBeenCalledWith("/v2/me", {}, "GET");
    expect(disable).toHaveBeenCalledTimes(ACCESS_POLICY_TOOL_NAMES.length);
  });

  it("keeps the tools for an account owner", async () => {
    const { tools, disable } = toolsWithSpies();
    const { ctx } = contextReturning({ ok: true, data: { is_account_owner: true } as never });

    await hideAccessPolicyToolsFromNonOwners(tools, ctx);

    expect(disable).not.toHaveBeenCalled();
  });

  it("keeps the tools while the API omits is_account_owner", async () => {
    const { tools, disable } = toolsWithSpies();
    const { ctx } = contextReturning({ ok: true, data: { workspaces: [] } as never });

    await hideAccessPolicyToolsFromNonOwners(tools, ctx);

    expect(disable).not.toHaveBeenCalled();
  });

  it("fails open when the lookup fails", async () => {
    const { tools, disable } = toolsWithSpies();
    const { ctx } = contextReturning({ ok: false, errors: [{ message: "boom" }] });

    await hideAccessPolicyToolsFromNonOwners(tools, ctx);

    expect(disable).not.toHaveBeenCalled();
  });
});
