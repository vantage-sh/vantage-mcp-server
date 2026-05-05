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
import tool from "./create-billing-profile";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  billing_information_attributes: undefined,
  business_information_attributes: undefined,
  banking_information_attributes: undefined,
  invoice_adjustment_attributes: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  nickname: "Test Billing Profile",
  billing_information_attributes: {
    company_name: "Acme Corp",
    country_code: "US",
    address_line_1: "123 Main St",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    billing_email: ["billing@acme.com"],
  },
  business_information_attributes: {
    metadata: {
      custom_fields: [{ name: "department", value: "engineering" }],
    },
  },
  banking_information_attributes: {
    bank_name: "First National Bank",
    beneficiary_name: "Acme Corp",
    tax_id: "12-3456789",
    secure_data: {
      account_number: "123456789",
      routing_number: "021000021",
    },
  },
  invoice_adjustment_attributes: {
    adjustment_items: [
      {
        name: "Service Fee",
        adjustment_type: "charge",
        calculation_type: "fixed",
        amount: 50,
      },
    ],
  },
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...undefineds,
      nickname: "Minimal Profile",
    },
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "empty nickname",
    data: {
      ...undefineds,
      nickname: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "with billing information only",
    data: {
      ...undefineds,
      nickname: "Billing Only Profile",
      billing_information_attributes: {
        company_name: "Test Corp",
        billing_email: ["test@corp.com"],
      },
    },
  },
  {
    name: "with invoice adjustments",
    data: {
      ...undefineds,
      nickname: "Adjusted Profile",
      invoice_adjustment_attributes: {
        adjustment_items: [
          {
            name: "Discount",
            adjustment_type: "discount",
            calculation_type: "percentage",
            amount: 10,
          },
          {
            name: "Credit",
            adjustment_type: "credit",
            calculation_type: "fixed",
            amount: 100,
          },
        ],
      },
    },
  },
];

const successData = {
  token: "blng_prf_123",
  nickname: "Test Billing Profile",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
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
  managed_accounts_count: "0",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/billing_profiles",
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
        endpoint: "/v2/billing_profiles",
        params: {
          nickname: "Failed Profile",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Validation failed" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        nickname: "Failed Profile",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Validation failed" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
