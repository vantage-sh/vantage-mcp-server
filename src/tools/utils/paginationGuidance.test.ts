import { expect, test } from "vitest";
import { PAGINATION_GUIDANCE, PAGINATION_LIMIT_GUIDANCE } from "./paginationGuidance";

test("pagination guidance documents response fields and stop condition", () => {
  expect(PAGINATION_GUIDANCE).toContain("hasNextPage");
  expect(PAGINATION_GUIDANCE).toContain("nextPage");
  expect(PAGINATION_LIMIT_GUIDANCE).toContain("limit");
});
