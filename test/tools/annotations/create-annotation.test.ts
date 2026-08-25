import { expect } from "vitest";
import tool from "../../../src/tools/annotations/create-annotation";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  report_tokens: ["rprt_123", "rprt_456"],
  title: "Migration completed",
  date: "2026-08-12",
  message: "Infrastructure migration completed",
};

const annotation = {
  token: "issue_123",
  title: "Migration completed",
  report_tokens: ["rprt_123", "rprt_456"],
  date: "2026-08-12",
  message: "Infrastructure migration completed",
};

testTool(
  tool,
  [
    {
      name: "takes Report tokens, title, date, and message",
      data: validArguments,
    },
    {
      name: "allows the title to be omitted",
      data: {
        ...validArguments,
        title: undefined,
      },
    },
    {
      name: "rejects an invalid Report token",
      data: {
        ...validArguments,
        report_tokens: ["rprt_123", "issue_123"],
      },
      expectedIssues: ["Must be a Cost Report token (rprt_*)"],
    },
    {
      name: "rejects an empty Report token list",
      data: {
        ...validArguments,
        report_tokens: [],
      },
      expectedIssues: ["Too small: expected array to have >=1 items"],
    },
    {
      name: "rejects an empty title",
      data: {
        ...validArguments,
        title: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
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
          endpoint: "/v2/annotations",
          params: validArguments,
          method: "POST",
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
          endpoint: "/v2/annotations",
          params: validArguments,
          method: "POST",
          result: {
            ok: false,
            errors: [{ message: "Report not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(validArguments);
        expect(error.exception).toEqual({
          errors: [{ message: "Report not found" }],
        });
      },
    },
  ]
);
