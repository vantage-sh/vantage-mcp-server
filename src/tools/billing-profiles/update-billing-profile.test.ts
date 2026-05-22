import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./update-billing-profile";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  nickname: undefined,
  billing_information_attributes: undefined,
  business_information_attributes: undefined,
  banking_information_attributes: undefined,
  invoice_adjustment_attributes: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  billing_profile_token: "blng_prf_123",
};

const validInputArguments: InferValidators<Validators> = {
  billing_profile_token: "blng_prf_123",
  nickname: "Updated Profile",
  billing_information_attributes: {
    company_name: "Updated Corp",
    country_code: "US",
    address_line_1: "456 Oak Ave",
    city: "San Francisco",
    state: "CA",
    postal_code: "94102",
  },
  business_information_attributes: {
    metadata: {
      custom_fields: [{ name: "team", value: "platform" }],
    },
  },
  banking_information_attributes: {
    bank_name: "Updated Bank",
    beneficiary_name: "Updated Corp",
  },
  invoice_adjustment_attributes: {
    adjustment_items: [
      {
        name: "Updated Fee",
        adjustment_type: "charge",
        calculation_type: "fixed",
        amount: 75,
      },
    ],
  },
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
    name: "empty nickname",
    data: {
      ...validInputArguments,
      nickname: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "update nickname only",
    data: {
      ...undefineds,
      billing_profile_token: "blng_prf_123",
      nickname: "New Nickname",
    },
  },
  {
    name: "update billing information only",
    data: {
      ...undefineds,
      billing_profile_token: "blng_prf_123",
      billing_information_attributes: {
        company_name: "New Company",
      },
    },
  },
];

const successData = {
  token: "blng_prf_123",
  nickname: "Updated Profile",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-06-01T00:00:00Z",
  billing_information_attributes: {
    token: "blng_inf_123",
    company_name: "Updated Corp",
    country_code: "US",
    address_line_1: "456 Oak Ave",
    address_line_2: null,
    city: "San Francisco",
    state: "CA",
    postal_code: "94102",
    billing_email: null,
  },
  business_information_attributes: {
    token: "biz_inf_123",
    metadata: { custom_fields: [{ name: "team", value: "platform" }] },
  },
  invoice_adjustment_attributes: {
    token: "inv_adj_123",
    adjustment_items: [],
  },
  managed_accounts_count: "2",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_123")}`,
        params: {
          nickname: "Updated Profile",
          billing_information_attributes: validInputArguments.billing_information_attributes,
          business_information_attributes: validInputArguments.business_information_attributes,
          banking_information_attributes: validInputArguments.banking_information_attributes,
          invoice_adjustment_attributes: validInputArguments.invoice_adjustment_attributes,
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
        endpoint: `/v2/billing_profiles/${pathEncode("blng_prf_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Billing profile not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Billing profile not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
