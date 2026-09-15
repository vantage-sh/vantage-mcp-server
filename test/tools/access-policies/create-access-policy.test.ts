import type { CreateAccessPolicyResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/access-policies/create-access-policy";
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
  team_tokens: undefined,
};

const minimalValidArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "Engineering costs",
  policy_filter: "(vantage.provider = 'aws')",
};

const validArguments: InferValidators<Validators> = {
  title: "Engineering costs",
  policy_filter: "(vantage.provider = 'aws')",
  description: "Limits cost visibility to the Engineering team.",
  team_tokens: ["team_fd5c524ba104712b"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalValidArguments },
  { name: "all valid arguments", data: validArguments },
  { name: "description can be cleared with null", data: { ...validArguments, description: null } },
  {
    name: "title is required",
    data: { ...undefineds, policy_filter: "(vantage.provider = 'aws')" } as never,
    expectedIssues: ["Invalid input: expected string, received undefined"],
  },
  {
    name: "title cannot be blank",
    data: { ...minimalValidArguments, title: "   " },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "policy filter is required",
    data: { ...undefineds, title: "Engineering costs" } as never,
    expectedIssues: ["Invalid input: expected string, received undefined"],
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

const successData: CreateAccessPolicyResponse = {
  token: "accss_plcy_c40f15062b6d5c37",
  title: "Engineering costs",
  description: "Limits cost visibility to the Engineering team.",
  policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'aws')" } },
  team_tokens: ["team_fd5c524ba104712b"],
  created_by: "usr_eb8ce6bdc1fa31d5",
  created_at: "2024-01-18T17:39:37Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call builds the v1 policy document",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/access_policies",
        params: {
          title: "Engineering costs",
          description: "Limits cost visibility to the Engineering team.",
          team_tokens: ["team_fd5c524ba104712b"],
          policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'aws')" } },
        },
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
        endpoint: "/v2/access_policies",
        params: {
          title: "Engineering costs",
          policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'aws')" } },
        },
        method: "POST",
        result: { ok: false, errors: [{ message: "Forbidden" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalValidArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Forbidden" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
