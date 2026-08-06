import {
  pathEncode,
  type UpdateVirtualTagConfigRequest,
  type UpdateVirtualTagConfigResponse,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-configs/update-virtual-tag-config";
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
  key: undefined,
  overridable: undefined,
  backfill_until: undefined,
  collapsed_tag_keys: undefined,
  values: undefined,
};

const validArguments: InferValidators<Validators> = {
  ...undefineds,
  virtual_tag_config_token: "vtag_123",
  key: "team",
  values: [
    {
      filter: "costs.provider = 'gcp'",
      name: "Product",
    },
    {
      filter: "costs.provider = 'aws'",
      name: "Platform",
    },
  ],
};

const requestBody = {
  key: validArguments.key,
  overridable: validArguments.overridable,
  backfill_until: validArguments.backfill_until,
  collapsed_tag_keys: validArguments.collapsed_tag_keys,
  values: validArguments.values,
} as unknown as UpdateVirtualTagConfigRequest;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "updates config metadata",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      overridable: false,
      backfill_until: null,
      collapsed_tag_keys: [{ key: "environment", filter: "costs.provider = 'aws'" }],
    },
  },
  {
    name: "replaces values in the supplied order",
    data: validArguments,
  },
  {
    name: "accepts open-ended value date ranges from get responses",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      values: [
        {
          filter: "costs.provider = 'aws'",
          name: "Platform",
          date_ranges: [{ start_date: null, end_date: "2026-12-31" }],
        },
      ],
    },
  },
  {
    name: "rejects an invalid nested date",
    data: {
      ...undefineds,
      virtual_tag_config_token: "vtag_123",
      values: [
        {
          filter: "costs.provider = 'aws'",
          name: "Platform",
          date_ranges: [{ start_date: "not-a-date" }],
        },
      ],
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
];

const successData: UpdateVirtualTagConfigResponse = {
  token: "vtag_123",
  created_by_token: null,
  key: "team",
  overridable: true,
  backfill_until: "2026-01-01",
  collapsed_tag_keys: [],
  values: [
    {
      token: "vtag_val_789",
      filter: "costs.provider = 'gcp'",
      name: "Product",
      label_transforms: [],
      percentages: [],
      date_ranges: [],
    },
    {
      token: "vtag_val_456",
      filter: "costs.provider = 'aws'",
      name: "Platform",
      label_transforms: [],
      percentages: [],
      date_ranges: [],
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with ordered values",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
        params: requestBody,
        method: "PUT",
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
      });
      expect(error.exception).toEqual({
        errors: [{ message: "At least one Virtual Tag Config field must be provided." }],
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/virtual_tag_configs/${pathEncode("vtag_123")}`,
        params: requestBody,
        method: "PUT",
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
