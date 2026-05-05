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
import tool from "./get-billing-rule";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const successData = {
  token: "blng_rl_123",
  title: "Exclude Support Charges",
  type: "exclusion",
  charge_type: "Support",
  apply_to_all: true,
  created_by_token: "usr_123",
  created_at: "2023-01-15T10:30:00Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes billing_rule_token",
    data: {
      billing_rule_token: "blng_rl_123",
    },
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_rules/${pathEncode("blng_rl_123")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        billing_rule_token: "blng_rl_123",
      });
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_rules/${pathEncode("blng_rl_notfound")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Billing rule not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        billing_rule_token: "blng_rl_notfound",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Billing rule not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
