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
import tool from "../../../src/tools/billing-rules/create-billing-rule";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
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

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  type: "exclusion",
  title: "Exclude Support",
  charge_type: "Support",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments for exclusion",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Exclude Support",
      charge_type: "Support",
    },
  },
  {
    name: "adjustment rule",
    data: {
      ...undefineds,
      type: "adjustment",
      title: "75% Adjustment",
      percentage: 75.0,
    },
  },
  {
    name: "credit rule",
    data: {
      ...undefineds,
      type: "credit",
      title: "Monthly Credit",
      service: "AWS",
      category: "Compute",
      sub_category: "EC2",
      amount: 300,
    },
  },
  {
    name: "charge rule",
    data: {
      ...undefineds,
      type: "charge",
      title: "Additional Charge",
      service: "AWS",
      category: "Storage",
      sub_category: "S3",
      amount: 150,
    },
  },
  {
    name: "custom rule",
    data: {
      ...undefineds,
      type: "custom",
      title: "Custom SQL Rule",
      sql_query: "SELECT * FROM costs WHERE provider = 'aws'",
    },
  },
  {
    name: "with start and end dates",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Dated Exclusion",
      charge_type: "Support",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
    },
  },
  {
    name: "with apply_to_all",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Global Exclusion",
      charge_type: "Tax",
      apply_to_all: true,
    },
  },
  {
    name: "empty title",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "invalid start_date",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Bad Date Rule",
      start_date: "invalid-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "invalid end_date",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Bad Date Rule",
      end_date: "invalid-date",
    },
    expectedIssues: ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
  },
  {
    name: "empty charge_type",
    data: {
      ...undefineds,
      type: "exclusion",
      title: "Empty Charge Type",
      charge_type: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty sql_query",
    data: {
      ...undefineds,
      type: "custom",
      title: "Empty SQL",
      sql_query: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData = {
  token: "blng_rl_123",
  title: "Exclude Support",
  type: "exclusion",
  charge_type: "Support",
  apply_to_all: null,
  created_by_token: "usr_123",
  created_at: "2023-01-15T10:30:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/billing_rules",
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
        endpoint: "/v2/billing_rules",
        params: {
          type: "exclusion",
          title: "Bad Rule",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "charge_type is required for exclusion rules" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        type: "exclusion",
        title: "Bad Rule",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "charge_type is required for exclusion rules" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
