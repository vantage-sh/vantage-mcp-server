import { expect, test } from "vitest";
import { nonempty } from "../../../src/utils/zod";

test("trims and accepts a non-empty string", () => {
  expect(nonempty().parse("  hello  ")).toBe("hello");
});

test("rejects empty and whitespace-only strings", () => {
  expect(nonempty().safeParse("").success).toBe(false);
  expect(nonempty().safeParse("   ").success).toBe(false);
});

test("supports a custom minimum length and message", () => {
  const schema = nonempty(3, "Too short");
  expect(schema.safeParse("ab").error?.issues[0]?.message).toBe("Too short");
  expect(schema.parse("abc")).toBe("abc");
});
