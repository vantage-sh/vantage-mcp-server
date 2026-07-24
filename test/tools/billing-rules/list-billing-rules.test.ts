import { expect } from "vitest";
import tool from "../../../src/tools/billing-rules/list-billing-rules";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData = {
  billing_rules: [
    {
      token: "blng_rl_123",
      title: "Exclude Support Charges",
      type: "exclusion",
      charge_type: "Support",
      apply_to_all: true,
      created_by_token: "usr_123",
      created_at: "2023-01-15T10:30:00Z",
    },
    {
      token: "blng_rl_456",
      title: "75% Adjustment",
      type: "adjustment",
      percentage: "75.0",
      apply_to_all: false,
      created_by_token: "usr_123",
      created_at: "2023-02-01T08:00:00Z",
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/billing_rules",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        billing_rules: successData.billing_rules,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/billing_rules",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
