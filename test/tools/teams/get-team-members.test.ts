import type { GetTeamMembersResponse } from "@vantage-sh/vantage-client";
import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import tool from "../../../src/tools/teams/get-team-members";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  team_token: "team_123",
  page: 2,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "default page", data: { team_token: "team_123", page: undefined } },
  { name: "valid arguments", data: validArguments },
  {
    name: "page must be positive",
    data: { ...validArguments, page: 0 },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "page must be an integer",
    data: { ...validArguments, page: 1.5 },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
];

const successData: GetTeamMembersResponse = {
  members: [
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      user_token: "usr_123",
      role: "owner",
    },
  ],
  links: {
    next: "https://api.vantage.sh/v2/teams/team_123/members?page=3",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/teams/${pathEncode("team_123")}/members`,
        params: { page: 2, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        members: successData.members,
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/teams/${pathEncode("team_123")}/members`,
        params: { page: 2, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: false, errors: [{ message: "Team not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Team not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
