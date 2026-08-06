import { pathEncode, type UpdateVirtualTagConfigValueResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-config-values/update-virtual-tag-config-value";
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
  filter: undefined,
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
  virtual_tag_config_value_token: "vtag_val_456",
  filter: "costs.provider = 'gcp'",
  name: "Cloud",
  percentages: [],
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
    name: "valid partial update",
    data: validArguments,
  },
  {
    name: "clears optional fields",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      virtual_tag_config_value_token: "vtag_val_456",
      display_name: null,
      label_values: [],
      label_transforms: [],
      date_ranges: [],
    },
  },
];

const successData: UpdateVirtualTagConfigValueResponse = {
  token: "vtag_val_456",
  filter: "costs.provider = 'gcp'",
  name: "Cloud",
  label_transforms: [],
  percentages: [],
  date_ranges: [],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful partial update",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values/${pathEncode("vtag_val_456")}`,
        params: requestBody,
        method: "PATCH",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual(successData);
    },
  },
  {
    name: "requires a field to update",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...undefineds,
        virtual_tag_config_token: "vtag_123",
        virtual_tag_config_value_token: "vtag_val_456",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "At least one Virtual Tag Config Value field must be provided." }],
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
        virtual_tag_config_value_token: "vtag_val_456",
        name: "Platform",
        business_metric_token: "bsnss_mtrc_123",
      });
      expect(error.exception).toEqual({
        errors: [
          {
            message: "Only one of name, business_metric_token, cost_metric, or percentages may be provided.",
          },
        ],
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}/values/${pathEncode("vtag_val_456")}`,
        params: requestBody,
        method: "PATCH",
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
