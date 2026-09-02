import { type GetFinancialCommitmentReportCostsResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/financial-commitment-reports/query-financial-commitment-report-costs";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  financial_commitment_report_token: "fncl_cmnt_rprt_123",
  page: 1,
  start_date: "2024-03-01",
  end_date: "2024-03-31",
  date_bin: "month",
  groupings: ["cost_type", "service"],
  filter: "(financial_commitments.provider = 'aws')",
  on_demand_costs_scope: "discountable",
  order: "asc",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "all valid arguments",
    data: validArguments,
  },
  {
    name: "takes financial_commitment_report_token only",
    data: {
      financial_commitment_report_token: "fncl_cmnt_rprt_123",
    },
  },
  {
    name: "rejects empty financial_commitment_report_token",
    data: {
      financial_commitment_report_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects invalid grouping",
    data: {
      financial_commitment_report_token: "fncl_cmnt_rprt_123",
      groupings: ["provider"],
    },
    expectedIssues: [
      "Grouping dimensions for aggregating costs on the report. Valid groupings: cost_type, commitment_type, commitment_id, service, resource_account_id, provider_account_id, region, cost_category, cost_sub_category, instance_type, and tag:<tag_key>.",
    ],
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetFinancialCommitmentReportCostsResponse = {
  costs: [
    {
      accrued_at: "2024-03-01T00:00:00Z",
      amount: "100.00",
      gross_amount: "150.00",
      on_demand_amount: "50.00",
      covered_gross_amount: "100.00",
      currency: "USD",
      cost_type: "SavingsPlanCoveredUsage",
      service: "Amazon Elastic Compute Cloud - Compute",
      cost_sub_category: "Compute",
      tags: [
        { key: "environment", value: "production" },
        { key: "owner", value: null },
      ],
    },
  ],
  total_amount: { amount: "100.00", currency: "USD" },
  total_gross_amount: { amount: "150.00", currency: "USD" },
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_123")}/costs`,
        params: {
          page: 1,
          start_date: "2024-03-01",
          end_date: "2024-03-31",
          date_bin: "month",
          groupings: "cost_type,service",
          filter: "(financial_commitments.provider = 'aws')",
          on_demand_costs_scope: "discountable",
          order: "asc",
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
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        costs: successData.costs,
        total_amount: successData.total_amount,
        total_gross_amount: successData.total_gross_amount,
        notes:
          "Costs records represent one month; accrued_at is the first day of the month. If your date range is shorter than a month, the record covers only that range.",
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "encodes financial_commitment_report_token in endpoint",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_123/with space")}/costs`,
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
        financial_commitment_report_token: "fncl_cmnt_rprt_123/with space",
      });
      expect(res.costs).toEqual(successData.costs);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_nonexistent")}/costs`,
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Financial commitment report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        financial_commitment_report_token: "fncl_cmnt_rprt_nonexistent",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Financial commitment report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
