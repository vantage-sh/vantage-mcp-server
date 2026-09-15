import type { GetAccessPoliciesResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/access-policies/list-access-policies";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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

const validArguments: InferValidators<Validators> = { page: 1 };

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "defaults the page", data: { page: undefined } },
  { name: "valid page number", data: validArguments },
  {
    name: "page must be a number",
    data: { page: "1" } as never,
    expectedIssues: ["Invalid input: expected number, received string"],
  },
];

const successData: GetAccessPoliciesResponse = {
  links: { next: "https://api.vantage.sh/v2/access_policies?page=2" },
  access_policies: [
    {
      token: "accss_plcy_c40f15062b6d5c37",
      title: "Engineering costs",
      description: "Limits cost visibility to the Engineering team.",
      policy: { api_version: "v1", policy: { filter: "(vantage.provider = 'aws')" } },
      team_tokens: ["team_fd5c524ba104712b"],
      created_by: "usr_eb8ce6bdc1fa31d5",
      created_at: "2024-01-18T17:39:37Z",
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call reports the next page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/access_policies",
        params: { page: 1, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        access_policies: successData.access_policies,
        pagination: { hasNextPage: true, nextPage: 2 },
      });
    },
  },
  {
    name: "successful call on the last page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/access_policies",
        params: { page: 1, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: true, data: { ...successData, links: { next: null } } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        access_policies: successData.access_policies,
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/access_policies",
        params: { page: 1, limit: DEFAULT_LIMIT },
        method: "GET",
        result: { ok: false, errors: [{ message: "Forbidden" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Forbidden" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
