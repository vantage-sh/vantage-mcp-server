import { type GetWorkspaceResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/workspaces/get-workspace";
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

const WORKSPACE_TOKEN = "wrkspc_ba4878d880507623";

const validArguments: InferValidators<Validators> = {
  workspace_token: WORKSPACE_TOKEN,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "valid workspace token",
    data: validArguments,
  },
];

const successData: GetWorkspaceResponse = {
  token: WORKSPACE_TOKEN,
  name: "Production",
  created_at: "2024-10-01T01:00:55Z",
  enable_currency_conversion: false,
  currency: "USD",
  exchange_rate_date: "daily_rate",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/workspaces/${pathEncode(WORKSPACE_TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/workspaces/${pathEncode(WORKSPACE_TOKEN)}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
