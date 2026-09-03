import { pathEncode, type UpdateTeamResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/teams/update-team";
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
  name: undefined,
  description: undefined,
  workspace_tokens: undefined,
  user_tokens: undefined,
  user_emails: undefined,
  role: undefined,
  default_dashboard_token: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  team_token: "team_123",
};

const validArguments: InferValidators<Validators> = {
  team_token: "team_123",
  name: "Platform",
  description: "Updated platform team",
  workspace_tokens: ["wrkspc_123"],
  user_tokens: ["usr_123"],
  user_emails: ["engineer@example.com"],
  role: "owner",
  default_dashboard_token: null,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalValidArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "validates Team token",
    data: { ...minimalValidArguments, team_token: "usr_123" },
    expectedIssues: ["Must be a Team token (team_*)"],
  },
  {
    name: "validates default Dashboard token",
    data: { ...validArguments, default_dashboard_token: "rprt_123" },
    expectedIssues: ["Must be a Dashboard token (dshbrd_*)"],
  },
];

const successData: UpdateTeamResponse = {
  token: "team_123",
  name: "Platform",
  description: "Updated platform team",
  workspace_tokens: ["wrkspc_123"],
  user_tokens: ["usr_123"],
  user_emails: ["engineer@example.com"],
  default_dashboard_token: null,
};

const { team_token: _teamToken, ...body } = validArguments;

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/teams/${pathEncode("team_123")}`,
        params: body,
        method: "PUT",
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
        endpoint: `/v2/teams/${pathEncode("team_123")}`,
        params: {},
        method: "PUT",
        result: { ok: false, errors: [{ message: "Team not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalValidArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Team not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
