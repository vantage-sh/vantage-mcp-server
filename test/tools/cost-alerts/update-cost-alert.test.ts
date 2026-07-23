import { pathEncode, type UpdateCostAlertResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import tool from "../../../src/tools/cost-alerts/update-cost-alert";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  email_recipients: undefined,
  interval: undefined,
  threshold: undefined,
  slack_channels: undefined,
  teams_channels: undefined,
  unit_type: undefined,
  report_tokens: undefined,
  minimum_threshold: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  cost_alert_token: "cstm_alrt_rl_123",
};

const validInputArguments: InferValidators<Validators> = {
  cost_alert_token: "cstm_alrt_rl_123",
  title: "Updated Cost Alert",
  email_recipients: ["user@example.com"],
  interval: "week",
  threshold: 250,
  slack_channels: ["#cost-alerts"],
  teams_channels: ["FinOps"],
  unit_type: "currency",
  report_tokens: ["rprt_123", "rprt_456"],
  minimum_threshold: 100,
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
    name: "rejects empty cost_alert_token",
    data: {
      ...validInputArguments,
      cost_alert_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects invalid interval",
    data: {
      ...validInputArguments,
      interval: "year" as any,
    },
    expectedIssues: ['Invalid option: expected one of "day"|"week"|"month"|"quarter"'],
  },
  {
    name: "rejects invalid unit_type",
    data: {
      ...validInputArguments,
      unit_type: "count" as any,
    },
    expectedIssues: ['Invalid option: expected one of "currency"|"percentage"'],
  },
  {
    name: "rejects non-positive threshold",
    data: {
      ...validInputArguments,
      threshold: 0,
    },
    expectedIssues: ["Too small: expected number to be >0"],
  },
  {
    name: "rejects empty report_tokens",
    data: {
      ...validInputArguments,
      report_tokens: [],
    },
    expectedIssues: ["Too small: expected array to have >=1 items"],
  },
  {
    name: "rejects negative minimum_threshold",
    data: {
      ...validInputArguments,
      minimum_threshold: -1,
    },
    expectedIssues: ["Too small: expected number to be >=0"],
  },
];

const successData: UpdateCostAlertResponse = {
  token: "cstm_alrt_rl_123",
  title: "Updated Cost Alert",
  interval: "week",
  threshold: 250,
  unit_type: "currency",
  workspace_token: "wrkspc_123",
  report_tokens: ["rprt_123", "rprt_456"],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-02T00:00:00Z",
  email_recipients: ["user@example.com"],
  slack_channels: ["#cost-alerts"],
  teams_channels: ["FinOps"],
  minimum_threshold: 100,
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}`,
        params: {
          title: "Updated Cost Alert",
          email_recipients: ["user@example.com"],
          interval: "week",
          threshold: 250,
          slack_channels: ["#cost-alerts"],
          teams_channels: ["FinOps"],
          unit_type: "currency",
          report_tokens: ["rprt_123", "rprt_456"],
          minimum_threshold: 100,
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
        endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_missing")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Cost alert not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_alert_token: "cstm_alrt_rl_missing",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost alert not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
