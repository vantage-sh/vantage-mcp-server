import { expect, it } from "vitest";
import { mutationOperation, parseConfirmationPolicy, requiresConfirmation } from "../../src/mcp/confirmation-policy";

const tool = (name: string, readOnly = false) => ({ name, annotations: { readOnly } });
const tools = [
  tool("create-folder"),
  tool("update-folder"),
  tool("delete-folder"),
  tool("get-folder", true),
  tool("add-team-member"),
  tool("remove-team-member"),
  tool("submit-user-feedback"),
  tool("archive-folder"),
];
const byName = (name: string) => tools.find((candidate) => candidate.name === name)!;

it.each([undefined, null, "none"])("preserves existing behavior for %s", (value) => {
  const policy = parseConfirmationPolicy(value, tools);
  for (const candidate of tools) expect(requiresConfirmation(policy, candidate)).toBe(false);
});
it("selects categories and individual mutation tools and normalizes the policy", () => {
  const policy = parseConfirmationPolicy(" Delete , create-folder,delete", tools);
  expect(policy.key).toBe("create-folder,delete");
  expect(requiresConfirmation(policy, byName("create-folder"))).toBe(true);
  expect(requiresConfirmation(policy, byName("delete-folder"))).toBe(true);
  expect(requiresConfirmation(policy, byName("remove-team-member"))).toBe(true);
  expect(requiresConfirmation(policy, byName("update-folder"))).toBe(false);
  expect(requiresConfirmation(policy, byName("add-team-member"))).toBe(false);
  expect(requiresConfirmation(policy, byName("get-folder"))).toBe(false);
});
it("classifies mutations by the read-only annotation and their verb", () => {
  expect(tools.map((candidate) => [candidate.name, mutationOperation(candidate)])).toEqual([
    ["create-folder", "create"],
    ["update-folder", "update"],
    ["delete-folder", "delete"],
    ["get-folder", undefined],
    ["add-team-member", "create"],
    ["remove-team-member", "delete"],
    ["submit-user-feedback", "create"],
    ["archive-folder", "update"],
  ]);
  expect(mutationOperation(tool("delete-folder", true))).toBeUndefined();
});
it("includes every mutation and never read-only tools for all", () => {
  const policy = parseConfirmationPolicy("all", tools);
  for (const candidate of tools) expect(requiresConfirmation(policy, candidate)).toBe(!candidate.annotations.readOnly);
});
it.each(["", " ", "delete,", "all,delete", "none,delete", "destroy", "delete-fodler", "get-folder", "a".repeat(8193)])(
  "rejects malformed policies: %s",
  (value) => {
    expect(() => parseConfirmationPolicy(value, tools)).toThrow("X-MCP-Confirm");
  }
);
