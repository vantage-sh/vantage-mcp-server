import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/teams/delete-team";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

testTool(
  tool,
  [
    {
      name: "takes a Team token",
      data: { team_token: "team_123" },
    },
    {
      name: "validates Team token",
      data: { team_token: "usr_123" },
      expectedIssues: ["Must be a Team token (team_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/teams/${pathEncode("team_123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess({ team_token: "team_123" })).toEqual({ token: "team_123" });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/teams/${pathEncode("team_missing")}`,
          params: {},
          method: "DELETE",
          result: { ok: false, errors: [{ message: "Team not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({ team_token: "team_missing" });
        expect(error.exception).toEqual({ errors: [{ message: "Team not found" }] });
      },
    },
  ]
);
