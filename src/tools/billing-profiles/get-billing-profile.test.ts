import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./get-billing-profile";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const success = {
  token: "blng_prf_123",
  nickname: "Primary Profile",
  created_at: "2023-01-15T10:30:00Z",
  updated_at: "2023-06-01T08:00:00Z",
  billing_information_attributes: {
    token: "blng_inf_123",
    company_name: "Acme Corp",
    country_code: "US",
    address_line_1: "123 Main St",
    address_line_2: null,
    city: "New York",
    state: "NY",
    postal_code: "10001",
    billing_email: ["billing@acme.com"],
  },
  business_information_attributes: {
    token: "biz_inf_123",
    metadata: { custom_fields: [] },
  },
  invoice_adjustment_attributes: {
    token: "inv_adj_123",
    adjustment_items: [],
  },
  managed_accounts_count: "3",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes billing_profile_token",
    data: {
      billing_profile_token: "blng_prf_123",
    },
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_123")}`,
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
        billing_profile_token: "blng_prf_123",
      });
      expect(res).toEqual(success);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_notfound")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Billing profile not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        billing_profile_token: "blng_prf_notfound",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Billing profile not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
