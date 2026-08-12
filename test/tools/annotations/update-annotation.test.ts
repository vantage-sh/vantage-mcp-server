import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/annotations/update-annotation";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  annotation_token: "issue_123",
  title: "Migration rescheduled",
  date: "2026-08-14",
  message: "Infrastructure migration rescheduled",
  report_tokens: ["rprt_456", "rprt_789"],
};

const annotation = {
  token: "issue_123",
  title: "Migration rescheduled",
  report_tokens: ["rprt_456", "rprt_789"],
  date: "2026-08-14",
  message: "Infrastructure migration rescheduled",
};

testTool(
  tool,
  [
    {
      name: "takes an Annotation token, title, date, message, and Report tokens",
      data: validArguments,
    },
    {
      name: "takes only a message",
      data: {
        annotation_token: "issue_123",
        title: undefined,
        date: undefined,
        message: "Updated message",
        report_tokens: undefined,
      },
    },
    {
      name: "takes only replacement Report tokens",
      data: {
        annotation_token: "issue_123",
        title: undefined,
        date: undefined,
        message: undefined,
        report_tokens: ["rprt_456", "rprt_789"],
      },
    },
    {
      name: "takes only a title",
      data: {
        annotation_token: "issue_123",
        title: "Updated title",
        date: undefined,
        message: undefined,
        report_tokens: undefined,
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
      name: "rejects an invalid Report token",
      data: {
        ...validArguments,
        report_tokens: ["rprt_456", "issue_123"],
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
          endpoint: `/v2/annotations/${pathEncode("issue_123")}`,
          params: {
            title: "Migration rescheduled",
            date: "2026-08-14",
            message: "Infrastructure migration rescheduled",
            report_tokens: ["rprt_456", "rprt_789"],
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
          title: undefined,
          date: undefined,
          message: "Updated message",
          report_tokens: undefined,
        });
        expect(error.exception).toEqual({
          errors: [{ message: "Annotation not found" }],
        });
      },
    },
  ]
);
