import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/annotations/delete-annotation";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

testTool(
  tool,
  [
    {
      name: "takes an Annotation token",
      data: {
        annotation_token: "issue_123",
      },
    },
    {
      name: "rejects an invalid Annotation token",
      data: {
        annotation_token: "rprt_123",
      },
      expectedIssues: ["Must be a Annotation token (issue_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/annotations/${pathEncode("issue_123")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const response = await callExpectingSuccess({
          annotation_token: "issue_123",
        });
        expect(response).toEqual({ token: "issue_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/annotations/${pathEncode("issue_missing")}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Annotation not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({
          annotation_token: "issue_missing",
        });
        expect(error.exception).toEqual({
          errors: [{ message: "Annotation not found" }],
        });
      },
    },
  ]
);
