import type { GetVirtualTagConfigsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/virtual-tag-configs/list-virtual-tag-configs";
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

const validArguments: InferValidators<Validators> = {
  page: 2,
  q: "team",
};

const expectedParams = { page: 2, q: "team", limit: 10 };

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "default page, no search", data: { page: undefined, q: undefined } },
  { name: "page and search", data: validArguments },
];

// `links` is not yet typed in @vantage-sh/vantage-client 2.39.0; core#24317 adds it to the response.
const successData: GetVirtualTagConfigsResponse & { links: { next: string | null } } = {
  links: { next: "https://api.vantage.sh/v2/virtual_tag_configs?limit=10&page=3&q=team" },
  virtual_tag_configs: [
    {
      token: "vtag_123",
      created_by_token: null,
      key: "team",
      hidden: false,
      preferred: true,
      overridable: true,
      backfill_until: "2026-01-01",
      collapsed_tag_keys: [{ key: "team", providers: [], filter: "costs.provider = 'aws'" }],
      values: [
        {
          token: "vtag_val_456",
          filter: "costs.provider = 'aws' AND costs.account_id IN ('1234', '5678')",
          name: "Platform",
          label_transforms: [],
          percentages: [{ value: "Shared", pct: 50 }],
          date_ranges: [],
        },
        {
          token: "vtag_val_789",
          filter: null,
          business_metric_token: "bsnss_mtrc_123",
          label_key: "team",
          cost_metric: { filter: "costs.provider = 'aws'", aggregation: { tag: "team" } },
          display_name: "By Usage",
          label_transforms: [{ type: "split", delimiter: "-", index: 0 }],
          percentages: [],
          date_ranges: [],
        },
      ],
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call returns summarized configs and pagination",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/virtual_tag_configs",
        params: expectedParams,
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual({
        virtual_tag_configs: [
          {
            token: "vtag_123",
            key: "team",
            hidden: false,
            preferred: true,
            overridable: true,
            backfill_until: "2026-01-01",
            values: [
              { token: "vtag_val_456", name: "Platform" },
              { token: "vtag_val_789", name: "By Usage" },
            ],
          },
        ],
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/virtual_tag_configs",
        params: expectedParams,
        method: "GET",
        result: { ok: false, errors: [{ message: "Access denied" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Access denied" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
