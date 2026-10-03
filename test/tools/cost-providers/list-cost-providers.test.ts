import { expect } from "vitest";
import tool from "../../../src/tools/cost-providers/list-cost-providers";
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
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "valid workspace_token",
    data: validArguments,
  },
];

const successData = {
  cost_providers: [
    { name: "AWS", key: "aws" },
    { name: "Azure", key: "azure" },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/cost_providers",
        params: {
          workspace_token: "wrkspc_123",
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
        providers: successData.cost_providers,
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
        endpoint: "/v2/cost_providers",
        params: {
          workspace_token: "wrkspc_123",
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Invalid workspace token" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Invalid workspace token" }],
      });
    },
  },
];

const validOutput = {
  providers: successData.cost_providers,
  pagination: {
    hasNextPage: false,
    nextPage: 0,
  },
};

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects an invalid pagination flag",
    data: { ...validOutput, pagination: { hasNextPage: "true" as any, nextPage: 2 } },
    expectedIssues: ["Invalid input: expected boolean, received string"],
  },
];

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
