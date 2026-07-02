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
import tool from "./create-canvas";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  workspace_token: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  title: "Weekly Spend by Team",
  prompt: "Show me weekly costs grouped by team",
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...undefineds,
      title: "My Canvas",
      prompt: "Show me costs by service",
    },
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
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
  title: "Weekly Spend by Team",
  status: "draft",
  prompt: "Show me weekly costs grouped by team",
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
        endpoint: "/v2/canvases",
        params: validInputArguments,
        method: "POST",
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
        endpoint: "/v2/canvases",
        params: {
          title: "Canvas without workspace",
          prompt: "Show me costs",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Can't find a default Workspace, try setting 'workspace_token' in your request." }],
        },
      } as any,
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        title: "Canvas without workspace",
        prompt: "Show me costs",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Can't find a default Workspace, try setting 'workspace_token' in your request." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
