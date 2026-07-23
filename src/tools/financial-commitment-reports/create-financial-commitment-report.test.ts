import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
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
} from "../../utils/testing";
import tool from "./create-financial-commitment-report";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;
type CreateFinancialCommitmentReportRequest = RequestBodyForPathAndMethod<"/v2/financial_commitment_reports", "POST">;

const undefineds = {
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
  workspace_token: "wrkspc_123",
  title: "Financial Commitment Report",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  workspace_token: "wrkspc_123",
  title: "AWS Commitments",
  filter: "(financial_commitments.provider = 'aws')",
  start_date: "2024-01-01",
  end_date: "2024-03-31",
  date_interval: "custom",
  date_bucket: "month",
  on_demand_costs_scope: "discountable",
  groupings: ["provider_account_id", "service"],
};

const expectedValidInputArguments = {
  ...validInputArguments,
  groupings: "provider_account_id,service",
} as unknown as CreateFinancialCommitmentReportRequest;
const expectedMinimalValidInputArguments =
  minimalValidInputArguments as unknown as CreateFinancialCommitmentReportRequest;

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
    name: "empty workspace token",
    data: {
      ...validInputArguments,
      workspace_token: "",
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
  {
    name: "tag grouping",
    data: {
      ...undefineds,
      workspace_token: "wrkspc_123",
      title: "Commitments by Environment",
      groupings: ["tag:environment"],
    },
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
    name: "invalid grouping",
    data: {
      ...validInputArguments,
      groupings: ["unsupported_grouping"],
    },
    expectedIssues: [
      "Grouping dimensions for aggregating financial commitments on the report. Valid groupings: provider, service, resource_account_id, provider_account_id, commitment_type, commitment_id, cost_type, cost_category, cost_sub_category, instance_type, region, and tag:<tag_key>.",
    ],
  },
  {
    name: "empty grouping",
    data: {
      ...validInputArguments,
      groupings: [""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
];

const successData = {
  token: "fncl_cmm_rprt_123",
  title: "AWS Commitments",
  default: false,
  created_at: "2024-01-15T10:30:00Z",
  workspace_token: "wrkspc_123",
  user_token: "usr_123",
  start_date: "2024-01-01",
  end_date: "2024-03-31",
  date_interval: "custom",
  date_bucket: "month",
  groupings: "provider_account_id,service",
  on_demand_costs_scope: "discountable",
  filter: "(financial_commitments.provider = 'aws')",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/financial_commitment_reports",
        params: expectedValidInputArguments,
        method: "POST",
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
        endpoint: "/v2/financial_commitment_reports",
        params: expectedMinimalValidInputArguments,
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
