import { expect } from "vitest";
import tool from "../../../src/tools/canvases/list-canvases";
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
  q: "Monthly Costs",
  workspace_token: "wrkspc_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
      q: undefined,
      workspace_token: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData = {
  canvases: [
    {
      token: "cnvs_abc123",
      title: "Monthly Costs by Provider",
      prompt: "Show me monthly costs by provider",
      data: { table: { columns: ["provider", "cost"], rows: [["aws", "100.00"]] } },
      workspace_token: "wrkspc_123",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/canvases",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Monthly Costs",
          workspace_token: "wrkspc_123",
        },
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      } as any,
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual({
        canvases: successData.canvases,
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
        endpoint: "/v2/canvases",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Monthly Costs",
          workspace_token: "wrkspc_123",
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      } as any,
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

const validOutput = {
  canvases: successData.canvases,
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
