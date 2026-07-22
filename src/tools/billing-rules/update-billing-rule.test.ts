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
import tool from "./update-billing-rule";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  start_date: undefined,
  end_date: undefined,
  apply_to_all: undefined,
  charge_type: undefined,
  percentage: undefined,
  service: undefined,
  category: undefined,
  sub_category: undefined,
  amount: undefined,
  sql_query: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  billing_rule_token: "blng_rl_123",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  billing_rule_token: "blng_rl_123",
  title: "Updated Rule",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  apply_to_all: true,
  charge_type: "Support",
  percentage: 50.0,
  service: "AWS",
  category: "Compute",
  sub_category: "EC2",
  amount: 500,
  sql_query: "SELECT * FROM costs",
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
    name: "empty title",
    data: {
      ...minimalValidInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "invalid start_date",
    data: {
      ...minimalValidInputArguments,
      start_date: "invalid-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "invalid end_date",
    data: {
      ...minimalValidInputArguments,
      end_date: "invalid-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "empty charge_type",
    data: {
      ...minimalValidInputArguments,
      charge_type: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty service",
    data: {
      ...minimalValidInputArguments,
      service: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData = {
  token: "blng_rl_123",
  title: "Updated Rule",
  type: "exclusion",
  charge_type: "Support",
  apply_to_all: true,
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  created_by_token: "usr_123",
  created_at: "2023-01-15T10:30:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/billing_rules/${pathEncode("blng_rl_123")}`,
        params: {
          title: "Updated Rule",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          apply_to_all: true,
          charge_type: "Support",
          percentage: 50.0,
          service: "AWS",
          category: "Compute",
          sub_category: "EC2",
          amount: 500,
          sql_query: "SELECT * FROM costs",
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
        endpoint: `/v2/billing_rules/${pathEncode("blng_rl_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Billing rule not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Billing rule not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
