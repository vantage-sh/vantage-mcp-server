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
} from "../../utils/testing";
import tool from "./update-canvas";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  prompt: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  canvas_token: "cnvs_abc123",
};

const validInputArguments: InferValidators<Validators> = {
  canvas_token: "cnvs_abc123",
  title: "Updated Title",
  prompt: "Show me monthly costs by provider",
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
    name: "title only",
    data: {
      ...undefineds,
      canvas_token: "cnvs_abc123",
      title: "New Title",
    },
  },
  {
    name: "prompt only",
    data: {
      ...undefineds,
      canvas_token: "cnvs_abc123",
      prompt: "Show me costs by region",
    },
  },
  {
    name: "empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "empty prompt",
    data: {
      ...validInputArguments,
      prompt: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData = {
  token: "cnvs_abc123",
  title: "Updated Title",
  status: "draft",
  prompt: "Show me monthly costs by provider",
  saved: true,
  data: { table: null },
  workspace_token: "wrkspc_123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/canvases/${pathEncode("cnvs_abc123")}`,
        params: {
          title: "Updated Title",
          prompt: "Show me monthly costs by provider",
        },
        method: "PUT",
        result: {
          ok: true,
          data: successData,
        },
      } as any,
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
        endpoint: `/v2/canvases/${pathEncode("cnvs_abc123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Canvas not found" }],
        },
      } as any,
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Canvas not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
