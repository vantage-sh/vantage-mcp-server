import type { GetFinancialCommitmentReportsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-financial-commitment-reports";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  limit: 25,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default pagination arguments",
    data: {
      page: undefined,
      limit: undefined,
    },
  },
  {
    name: "valid pagination arguments",
    data: validArguments,
  },
  {
    name: "invalid page below minimum",
    data: {
      page: 0,
      limit: undefined,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "invalid fractional page",
    data: {
      page: 1.5,
      limit: undefined,
    },
    expectedIssues: ["Invalid input: expected int, received number"],
  },
  {
    name: "invalid limit below minimum",
    data: {
      page: undefined,
      limit: 0,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "invalid limit above maximum",
    data: {
      page: undefined,
      limit: 1001,
    },
    expectedIssues: ["Too big: expected number to be <=1000"],
  },
];

function makeFinancialCommitmentReport(token: string) {
  return {
    token,
    title: `Financial Commitment Report ${token}`,
    default: false,
    created_at: "2025-01-27T21:42:06Z",
    workspace_token: "wrkspc_123",
    user_token: null,
    start_date: "2024-10-01",
    end_date: "2025-01-25",
    date_interval: "last_3_months",
    date_bucket: "month",
    groupings: "cost_type",
    on_demand_costs_scope: "discountable",
    filter: "(financial_commitments.provider = 'aws')",
  };
}

const successData: GetFinancialCommitmentReportsResponse = {
  financial_commitment_reports: [
    makeFinancialCommitmentReport("fncl_cmnt_rprt_123"),
    makeFinancialCommitmentReport("fncl_cmnt_rprt_456"),
  ],
  links: {},
};

const successDataWithNextPage: GetFinancialCommitmentReportsResponse = {
  ...successData,
  links: {
    next: "https://api.vantage.sh/v2/financial_commitment_reports?page=3&limit=25",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with default pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/financial_commitment_reports",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        page: undefined,
        limit: undefined,
      });
      expect(res).toEqual({
        financial_commitment_reports: successData.financial_commitment_reports,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with custom pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/financial_commitment_reports",
        params: {
          page: 1,
          limit: 25,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        financial_commitment_reports: successData.financial_commitment_reports,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call with next page",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/financial_commitment_reports",
        params: {
          page: 2,
          limit: 25,
        },
        method: "GET",
        result: {
          ok: true,
          data: successDataWithNextPage,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        page: 2,
        limit: 25,
      });
      expect(res).toEqual({
        financial_commitment_reports: successData.financial_commitment_reports,
        pagination: {
          hasNextPage: true,
          nextPage: 3,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/financial_commitment_reports",
        params: {
          page: 1,
          limit: 25,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
