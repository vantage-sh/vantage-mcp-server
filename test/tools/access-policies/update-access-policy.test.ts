import { pathEncode, type UpdateAccessPolicyResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/access-policies/update-access-policy";
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
  title: undefined,
  policy_filter: undefined,
  description: undefined,
  team_tokens: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  access_policy_token: "accss_plcy_c40f15062b6d5c37",
};

const validArguments: InferValidators<Validators> = {
  access_policy_token: "accss_plcy_c40f15062b6d5c37",
  title: "Engineering GCP costs",
  policy_filter: "(vantage.provider = 'gcp')",
  description: null,
  team_tokens: ["team_fd5c524ba104712b"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalValidArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "validates Access Policy token",
    data: { ...minimalValidArguments, access_policy_token: "rsrc_accss_grnt_123" },
    expectedIssues: ["Must be a Access Policy token (accss_plcy_*)"],
  },
  {
    name: "title cannot be blank",
    data: { ...minimalValidArguments, title: "   " },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "policy filter cannot be blank",
    data: { ...minimalValidArguments, policy_filter: "   " },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "validates Team tokens",
    data: { ...validArguments, team_tokens: ["usr_123"] },
    expectedIssues: ["Must be a Team token (team_*)"],
  },
];

const successData: UpdateAccessPolicyResponse = {
  token: "accss_plcy_c40f15062b6d5c37",
  title: "Engineering GCP costs",
  description: null,
  policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'gcp')" } },
  team_tokens: ["team_fd5c524ba104712b"],
  created_by: "usr_eb8ce6bdc1fa31d5",
  created_at: "2024-01-18T17:39:37Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call builds the v1 policy document",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/access_policies/${pathEncode("accss_plcy_c40f15062b6d5c37")}`,
        params: {
          title: "Engineering GCP costs",
          description: null,
          team_tokens: ["team_fd5c524ba104712b"],
          policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'gcp')" } },
        },
        method: "PUT",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual(successData);
    },
  },
  {
    name: "omits the policy document when no filter is given",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/access_policies/${pathEncode("accss_plcy_c40f15062b6d5c37")}`,
        params: { title: "Renamed policy" },
        method: "PUT",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess({ ...minimalValidArguments, title: "Renamed policy" })).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/access_policies/${pathEncode("accss_plcy_c40f15062b6d5c37")}`,
        params: {},
        method: "PUT",
        result: { ok: false, errors: [{ message: "Access Policy not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalValidArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Access Policy not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
