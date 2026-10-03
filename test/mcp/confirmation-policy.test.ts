import { expect, it } from "vitest";
import { mutationOperation, parseConfirmationPolicy, requiresConfirmation } from "../../src/mcp/confirmation-policy";

const names = ["create-folder", "update-folder", "delete-folder", "get-folder"];
it.each([undefined, null, "none"])("preserves existing behavior for %s", (value) => {
  const policy = parseConfirmationPolicy(value, names);
  for (const name of names) expect(requiresConfirmation(policy, name)).toBe(false);
});
it("selects categories and individual mutation tools and normalizes the policy", () => {
  const policy = parseConfirmationPolicy(" Delete , create-folder,delete", names);
  expect(policy.key).toBe("create-folder,delete");
  expect(requiresConfirmation(policy, "create-folder")).toBe(true);
  expect(requiresConfirmation(policy, "delete-folder")).toBe(true);
  expect(requiresConfirmation(policy, "update-folder")).toBe(false);
  expect(requiresConfirmation(policy, "get-folder")).toBe(false);
});
it("includes every CRUD category and never read-only tools for all", () => {
  const policy = parseConfirmationPolicy("all", names);
  for (const name of names) expect(requiresConfirmation(policy, name)).toBe(!!mutationOperation(name));
});
it.each(["", " ", "delete,", "all,delete", "none,delete", "destroy", "delete-fodler", "get-folder", "a".repeat(8193)])(
  "rejects malformed policies: %s",
  (value) => {
    expect(() => parseConfirmationPolicy(value, names)).toThrow("X-MCP-Confirm");
  }
);
