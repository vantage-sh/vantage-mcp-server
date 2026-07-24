import { type GetFinancialCommitmentReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../src/tools/get-financial-commitment-report";
import { requestsInOrder, testTool } from "../../src/utils/testing";

const success: GetFinancialCommitmentReportResponse = {
  token: "fncl_cmnt_rprt_86a93126175f91ed",
  title: "All Financial Commitments",
  default: false,
  created_at: "2025-01-27T21:42:04Z",
  workspace_token: "wrkspc_0e9408c2a0682914",
  user_token: null,
  start_date: "2024-10-01",
  end_date: "2025-01-25",
  date_interval: "last_3_months",
  date_bucket: "month",
  groupings: "cost_type",
  on_demand_costs_scope: "discountable",
  filter: "(financial_commitments.provider = 'aws')",
};

testTool(
  tool,
  [
    {
      name: "takes financial_commitment_report_token",
      data: {
        financial_commitment_report_token: "fncl_cmnt_rprt_86a93126175f91ed",
      },
    },
    {
      name: "rejects empty financial_commitment_report_token",
      data: {
        financial_commitment_report_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_86a93126175f91ed")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          financial_commitment_report_token: "fncl_cmnt_rprt_86a93126175f91ed",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "encodes financial_commitment_report_token in endpoint",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_86a93126175f91ed/with space")}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          financial_commitment_report_token: "fncl_cmnt_rprt_86a93126175f91ed/with space",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/financial_commitment_reports/${pathEncode("fncl_cmnt_rprt_nonexistent")}`,
          params: {},
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
  ]
);
