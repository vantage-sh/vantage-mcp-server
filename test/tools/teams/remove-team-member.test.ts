import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/teams/remove-team-member";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const validArguments = {
  team_token: "team_123",
  user_token: "usr_123",
};

testTool(
  tool,
  [
    { name: "takes Team and user tokens", data: validArguments },
    {
      name: "validates Team token",
      data: { ...validArguments, team_token: "usr_123" },
      expectedIssues: ["Must be a Team token (team_*)"],
    },
    {
      name: "validates user token",
      data: { ...validArguments, user_token: "team_123" },
      expectedIssues: ["Must be a User token (usr_*)"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/teams/${pathEncode("team_123")}/members/${pathEncode("usr_123")}`,
          params: {},
          method: "DELETE",
          result: { ok: true, data: undefined },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess(validArguments)).toEqual(validArguments);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/teams/${pathEncode("team_123")}/members/${pathEncode("usr_missing")}`,
          params: {},
          method: "DELETE",
          result: { ok: false, errors: [{ message: "Team member not found" }] },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({
          team_token: "team_123",
          user_token: "usr_missing",
        });
        expect(error.exception).toEqual({ errors: [{ message: "Team member not found" }] });
      },
    },
  ]
);
