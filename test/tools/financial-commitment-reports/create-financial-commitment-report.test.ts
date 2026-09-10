import { VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/financial-commitment-reports/create-financial-commitment-report";
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
    name: "all built-in groupings",
    data: {
      ...minimalValidInputArguments,
      groupings: [...VANTAGE_FINANCIAL_COMMITMENT_GROUPINGS],
    },
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
    name: "empty tag key",
    data: {
      ...validInputArguments,
      groupings: ["tag:"],
    },
    expectedIssues: ["Grouping dimensions for the report. Use tag:<tag_key> to group by tag."],
  },
  {
    name: "whitespace-only tag key",
    data: {
      ...validInputArguments,
      groupings: ["tag: \t"],
    },
    expectedIssues: ["Grouping dimensions for the report. Use tag:<tag_key> to group by tag."],
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
        params: validInputArguments,
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
        params: minimalValidInputArguments,
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
