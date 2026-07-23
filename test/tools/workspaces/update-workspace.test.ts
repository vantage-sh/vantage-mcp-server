import { pathEncode, type UpdateWorkspaceResponse } from "@vantage-sh/vantage-client";
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
import tool from "../../../src/tools/workspaces/update-workspace";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const WORKSPACE_TOKEN = "wrkspc_ba4878d880507623";

const undefineds = {
  name: undefined,
  enable_currency_conversion: undefined,
  currency: undefined,
  exchange_rate_date: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  workspace_token: WORKSPACE_TOKEN,
};

const validInputArguments: InferValidators<Validators> = {
  workspace_token: WORKSPACE_TOKEN,
  name: "Updated Production",
  enable_currency_conversion: true,
  currency: "EUR",
  exchange_rate_date: "daily_rate",
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
];

const successData: UpdateWorkspaceResponse = {
  token: WORKSPACE_TOKEN,
  name: "Updated Production",
  created_at: "2024-10-01T01:00:55Z",
  enable_currency_conversion: true,
  currency: "EUR",
  exchange_rate_date: "daily_rate",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/workspaces/${pathEncode(WORKSPACE_TOKEN)}`,
        params: {
          name: "Updated Production",
          enable_currency_conversion: true,
          currency: "EUR",
          exchange_rate_date: "daily_rate",
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
        endpoint: `/v2/workspaces/${pathEncode(WORKSPACE_TOKEN)}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
