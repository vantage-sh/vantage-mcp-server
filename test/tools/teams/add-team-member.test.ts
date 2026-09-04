import { type AddTeamMemberResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/teams/add-team-member";
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
  user_email: "integration@example.com",
  role: "integration_owner",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "role defaults to editor",
    data: { team_token: "team_123", user_email: "member@example.com", role: undefined },
  },
  { name: "valid arguments", data: validArguments },
  {
    name: "validates user email",
    data: { ...validArguments, user_email: "not-an-email" },
    expectedIssues: ["Invalid email address"],
  },
  {
    name: "validates member role",
    data: { ...validArguments, role: "admin" as never },
    expectedIssues: ['Invalid option: expected one of "owner"|"editor"|"viewer"|"integration_owner"'],
  },
];

const successData: AddTeamMemberResponse = {
  name: "Integration User",
  email: "integration@example.com",
  user_token: "usr_123",
  role: "integration_owner",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/teams/${pathEncode("team_123")}/members`,
        params: { user_email: "integration@example.com", role: "integration_owner" },
        method: "POST",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/teams/${pathEncode("team_123")}/members`,
        params: { user_email: "integration@example.com", role: "integration_owner" },
        method: "POST",
        result: { ok: false, errors: [{ message: "User not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "User not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
