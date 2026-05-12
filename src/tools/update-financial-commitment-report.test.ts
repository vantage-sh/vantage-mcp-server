import { pathEncode, type UpdateFinancialCommitmentReportResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./update-financial-commitment-report";
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

const undefineds = {
  title: undefined,
  filter: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  date_bucket: undefined,
  on_demand_costs_scope: undefined,
  groupings: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  financial_commitment_report_token: "fncl_cmnt_rprt_123",
};

const validInputArguments: InferValidators<Validators> = {
  financial_commitment_report_token: "fncl_cmnt_rprt_123",
  title: "Updated Financial Commitment Report",
  filter: "(financial_commitments.provider = 'aws')",
  start_date: "2024-10-01",
  end_date: "2025-01-25",
  date_interval: "last_3_months",
  date_bucket: "week",
  on_demand_costs_scope: "discountable",
  groupings: ["cost_type", "commitment_type"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidInputArguments,
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "invalid date bucket",
    data: {
      ...validInputArguments,
      date_bucket: "year" as any,
    },
    expectedIssues: ['Invalid option: expected one of "hour"|"day"|"week"|"month"|"quarter"'],
  },
  {
    name: "invalid on-demand costs scope",
    data: {
      ...validInputArguments,
      on_demand_costs_scope: "covered" as any,
    },
    expectedIssues: ['Invalid option: expected one of "discountable"|"all"'],
  },
  {
    name: "invalid date interval",
    data: {
      ...validInputArguments,
      date_interval: "invalid" as any,
    },
    expectedIssues: [
      'Invalid option: expected one of "this_month"|"last_7_days"|"last_30_days"|"last_month"|"last_3_months"|"last_6_months"|"custom"|"last_12_months"|"last_24_months"|"last_36_months"|"year_to_date"|"last_3_days"|"last_14_days"',
    ],
  },
  {
    name: "invalid start date",
    data: {
      ...validInputArguments,
      start_date: "not-a-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "invalid end date",
    data: {
      ...validInputArguments,
      end_date: "not-a-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "empty financial commitment report token",
    data: {
      ...validInputArguments,
      financial_commitment_report_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData: UpdateFinancialCommitmentReportResponse = {
  token: "fncl_cmnt_rprt_123",
  title: "Updated Financial Commitment Report",
  default: false,
  created_at: "2025-01-27T21:42:06Z",
  workspace_token: "wrkspc_123",
  user_token: null,
  start_date: "2024-10-01",
  end_date: "2025-01-25",
  date_interval: "last_3_months",
  date_bucket: "week",
  groupings: "cost_type,commitment_type",
  on_demand_costs_scope: "discountable",
  filter: "(financial_commitments.provider = 'aws')",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_123")}`,
        params: {
          title: "Updated Financial Commitment Report",
          filter: "(financial_commitments.provider = 'aws')",
          start_date: "2024-10-01",
          end_date: "2025-01-25",
          date_interval: "last_3_months",
          date_bucket: "week",
          on_demand_costs_scope: "discountable",
          groupings: ["cost_type", "commitment_type"],
        },
        method: "PUT",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validInputArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Financial Commitment Report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Financial Commitment Report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
