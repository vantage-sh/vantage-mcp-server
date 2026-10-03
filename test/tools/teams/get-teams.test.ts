import { expect } from "vitest";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import tool from "../../../src/tools/teams/get-teams";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";
import { success } from "./get-team.test";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
  q: "Finance",
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
  teams: [success],
  links: {},
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/teams",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Finance",
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
        teams: successData.teams,
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
        endpoint: "/v2/teams",
        params: {
          page: 1,
          limit: DEFAULT_LIMIT,
          q: "Finance",
          workspace_token: "wrkspc_123",
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

const validOutput = {
  teams: successData.teams,
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
