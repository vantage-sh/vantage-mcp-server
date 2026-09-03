import type { CreateTeamResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/teams/create-team";
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

const undefineds = {
  description: undefined,
  workspace_tokens: undefined,
  user_tokens: undefined,
  user_emails: undefined,
  role: undefined,
  default_dashboard_token: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  name: "FinOps",
};

const validArguments: InferValidators<Validators> = {
  name: "Platform",
  description: "Platform engineering",
  workspace_tokens: ["wrkspc_123"],
  user_tokens: ["usr_123"],
  user_emails: ["engineer@example.com"],
  role: "editor",
  default_dashboard_token: "dshbrd_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalValidArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "name is required",
    data: undefineds as never,
    expectedIssues: ["Invalid input: expected string, received undefined"],
  },
  {
    name: "name cannot be blank",
    data: { ...minimalValidArguments, name: "   " },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "validates Workspace tokens",
    data: { ...validArguments, workspace_tokens: ["usr_123"] },
    expectedIssues: ["Must be a Workspace token (wrkspc_*)"],
  },
  {
    name: "validates user emails",
    data: { ...validArguments, user_emails: ["not-an-email"] },
    expectedIssues: ["Invalid email address"],
  },
  {
    name: "validates Team roles",
    data: { ...validArguments, role: "integration_owner" as never },
    expectedIssues: ['Invalid option: expected one of "owner"|"editor"|"viewer"'],
  },
];

const successData: CreateTeamResponse = {
  token: "team_123",
  name: "Platform",
  description: "Platform engineering",
  workspace_tokens: ["wrkspc_123"],
  user_tokens: ["usr_123"],
  user_emails: ["engineer@example.com"],
  default_dashboard_token: "dshbrd_123",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/teams",
        params: validArguments,
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
        endpoint: "/v2/teams",
        params: minimalValidArguments,
        method: "POST",
        result: { ok: false, errors: [{ message: "Team name already exists" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalValidArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Team name already exists" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
