import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/canvases/get-canvas";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const successData = {
  token: "cnvs_abc123",
  title: "Monthly Costs by Provider",
  prompt: "Show me monthly costs by provider",
  data: { table: { columns: ["provider", "cost"], rows: [["aws", "100.00"]] } },
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

const validOutput = successData;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  { name: "Canvas without generated data", data: { ...validOutput, data: undefined } },
  { name: "Canvas with a workflow error", data: { ...validOutput, data: { error: "Query failed" } } },
  {
    name: "rejects a table that is not a record",
    data: { ...validOutput, data: { table: null as any } },
    expectedIssues: ["Invalid input: expected record, received null"],
  },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
