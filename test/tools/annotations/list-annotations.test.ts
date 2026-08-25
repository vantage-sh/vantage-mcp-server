import { expect } from "vitest";
import tool from "../../../src/tools/annotations/list-annotations";
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

const noArguments = {} as InferValidators<Validators>;

const validArguments: InferValidators<Validators> = {
  page: 2,
  limit: 25,
  report_token: "rprt_fb27faa25ef5ea72",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "no arguments",
    data: noArguments,
  },
  {
    name: "page, limit, and report token",
    data: validArguments,
  },
  {
    name: "limit above API maximum",
    data: {
      ...validArguments,
      limit: 5001,
    },
    expectedIssues: ["Too big: expected number to be <=5000"],
  },
  {
    name: "non-report token",
    data: {
      ...validArguments,
      report_token: "wrkspc_e5c550d14cfa3101",
    },
    expectedIssues: ["Must be a Cost Report token (rprt_*)"],
  },
];

const successData = {
  annotations: [
    {
      token: "annotation_123",
      title: "Deployment completed",
      report_tokens: ["rprt_fb27faa25ef5ea72"],
      date: "2026-08-12",
      message: "Deployment completed",
    },
    {
      token: "annotation_456",
      title: "Pricing update",
      report_tokens: ["rprt_fb27faa25ef5ea72", "rprt_123"],
      date: null,
      message: null,
    },
  ],
  links: {
    next: "https://api.vantage.sh/v2/annotations?page=3",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call with defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/annotations",
        params: {
          page: 1,
          limit: 100,
        },
        method: "GET",
        result: {
          ok: true,
          data: {
            ...successData,
            links: {},
          },
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(noArguments);
      expect(res).toEqual({
        annotations: successData.annotations,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "successful call filtered by report",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/annotations",
        params: validArguments,
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
        annotations: successData.annotations,
        pagination: {
          hasNextPage: true,
          nextPage: 3,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/annotations",
        params: {
          page: 1,
          limit: 100,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(noArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
