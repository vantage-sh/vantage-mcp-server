import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import tool from "../../../src/tools/canvases/get-canvas";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const successData = {
  token: "cnvs_abc123",
  title: "Monthly Costs by Provider",
  status: "draft",
  prompt: "Show me monthly costs by provider",
  saved: true,
  data: { table: null },
  workspace_token: "wrkspc_123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "takes canvas_token",
    data: {
      canvas_token: "cnvs_abc123",
    },
  },
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/canvases/${pathEncode("cnvs_abc123")}`,
        params: {},
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      } as any,
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        canvas_token: "cnvs_abc123",
      });
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/canvases/${pathEncode("cnvs_notfound")}`,
        params: {},
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Canvas not found" }],
        },
      } as any,
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        canvas_token: "cnvs_notfound",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Canvas not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
