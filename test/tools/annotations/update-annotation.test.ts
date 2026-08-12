import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/annotations/update-annotation";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  annotation_token: "issue_123",
  date: "2026-08-14",
  message: "Infrastructure migration rescheduled",
};

const annotation = {
  token: "issue_123",
  report_tokens: ["rprt_123"],
  date: "2026-08-14",
  message: "Infrastructure migration rescheduled",
};

testTool(
  tool,
  [
    {
      name: "takes an Annotation token, date, and message",
      data: validArguments,
    },
    {
      name: "takes only a message",
      data: {
        annotation_token: "issue_123",
        date: undefined,
        message: "Updated message",
      },
    },
    {
      name: "rejects an invalid Annotation token",
      data: {
        ...validArguments,
        annotation_token: "rprt_123",
      },
      expectedIssues: ["Must be a Annotation token (issue_*)"],
    },
    {
      name: "rejects an invalid date",
      data: {
        ...validArguments,
        date: "not-a-date",
      },
      expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
    },
    {
      name: "rejects an empty message",
      data: {
        ...validArguments,
        message: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/annotations/${pathEncode("issue_123")}`,
          params: {
            date: "2026-08-14",
            message: "Infrastructure migration rescheduled",
          },
          method: "PUT",
          result: {
            ok: true,
            data: annotation,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const response = await callExpectingSuccess(validArguments);
        expect(response).toEqual(annotation);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/annotations/${pathEncode("issue_missing")}`,
          params: {
            message: "Updated message",
          },
          method: "PUT",
          result: {
            ok: false,
            errors: [{ message: "Annotation not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({
          annotation_token: "issue_missing",
          date: undefined,
          message: "Updated message",
        });
        expect(error.exception).toEqual({
          errors: [{ message: "Annotation not found" }],
        });
      },
    },
  ]
);
