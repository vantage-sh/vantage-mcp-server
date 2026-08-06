import { type CreateVirtualTagConfigValueResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-config-values/create-virtual-tag-config-value";
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
  name: undefined,
  business_metric_token: undefined,
  label_key: undefined,
  label_values: undefined,
  display_name: undefined,
  label_transforms: undefined,
  cost_metric: undefined,
  percentages: undefined,
  date_ranges: undefined,
};

const validArguments: InferValidators<Validators> = {
  ...undefineds,
  virtual_tag_config_token: "vtag_123",
  filter: "costs.provider = 'aws'",
  business_metric_token: "bsnss_mtrc_123",
  label_key: "team",
  label_values: ["platform"],
  label_transforms: [{ type: "split", delimiter: "-", index: 0 }],
  date_ranges: [{ start_date: "2026-01-01", end_date: null }],
};

const requestBody = {
  filter: validArguments.filter,
  name: validArguments.name,
  business_metric_token: validArguments.business_metric_token,
  label_key: validArguments.label_key,
  label_values: validArguments.label_values,
  display_name: validArguments.display_name,
  label_transforms: validArguments.label_transforms,
  cost_metric: validArguments.cost_metric,
  percentages: validArguments.percentages,
  date_ranges: validArguments.date_ranges,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "valid business metric value",
    data: validArguments,
  },
  {
    name: "valid cost metric value",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      filter: "costs.provider = 'aws'",
      display_name: "Allocated Team",
      cost_metric: {
        filter: "costs.provider = 'aws'",
        aggregation: { tag: "team" },
      },
    },
  },
  {
    name: "valid percentage value",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      filter: "costs.provider = 'aws'",
      percentages: [
        { value: "platform", pct: 60 },
        { value: "product", pct: 40 },
      ],
    },
  },
  {
    name: "invalid date range",
    data: {
      ...validArguments,
      date_ranges: [{ start_date: "not-a-date" }],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
];

const successData: CreateVirtualTagConfigValueResponse = {
  token: "vtag_val_123",
  filter: "costs.provider = 'aws'",
  business_metric_token: "bsnss_mtrc_123",
  label_key: "team",
  label_values: ["platform"],
  label_transforms: [{ type: "split", delimiter: "-", index: 0 }],
  percentages: [],
  date_ranges: [{ start_date: "2026-01-01", end_date: null }],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values`,
        params: requestBody,
        method: "POST",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual(successData);
    },
  },
  {
    name: "requires a non-empty value type field",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...undefineds,
        virtual_tag_config_token: "vtag_123",
        filter: "costs.provider = 'aws'",
        percentages: [],
      });
      expect(error.exception).toEqual({
        errors: [
          {
            message: "Exactly one of name, business_metric_token, cost_metric, or percentages must be provided.",
          },
        ],
      });
    },
  },
  {
    name: "rejects multiple value type fields",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...undefineds,
        virtual_tag_config_token: "vtag_123",
        filter: "costs.provider = 'aws'",
        name: "Platform",
        percentages: [{ value: "platform", pct: 100 }],
      });
      expect(error.exception).toEqual({
        errors: [
          {
            message: "Exactly one of name, business_metric_token, cost_metric, or percentages must be provided.",
          },
        ],
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values`,
        params: requestBody,
        method: "POST",
        result: { ok: false, errors: [{ message: "Invalid VQL" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Invalid VQL" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
