import type { CreateResourceReportResponse } from "@vantage-sh/vantage-client";
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
import tool from "./create-resource-report";

const WORKSPACE_TOKEN: string = "wrkspc_2ed2f1a59293a996";
const BAD_WORKSPACE_TOKEN: string = "wrkspc_nonexistent";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  filter: undefined,
  columns: undefined,
  folder_token: undefined,
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  workspace_token: WORKSPACE_TOKEN,
  title: "Production EC2",
  filter: "resources.provider = 'aws' AND resources.type = 'aws_instance'",
  columns: ["provider", "label", "type", "region", "account"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: {
      ...undefineds,
      workspace_token: WORKSPACE_TOKEN,
    },
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "empty workspace_token",
    data: {
      ...validInputArguments,
      workspace_token: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
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
    name: "empty column name",
    data: {
      ...validInputArguments,
      columns: ["provider", ""],
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData: CreateResourceReportResponse = {
  token: "prvdr_rsrc_rprt_d881b5362adab1c2",
  title: "Production EC2",
  filter: "resources.provider = 'aws' AND resources.type = 'aws_instance'",
  created_at: "2025-08-14T19:13:32Z",
  workspace_token: WORKSPACE_TOKEN,
  user_token: null,
  created_by_token: "team_16f0d31149f3254a",
  columns: ["provider", "label", "type", "region", "account"],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/resource_reports",
        params: validInputArguments,
        method: "POST",
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
        endpoint: "/v2/resource_reports",
        params: {
          workspace_token: BAD_WORKSPACE_TOKEN,
          title: "Invalid Report",
        },
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        workspace_token: BAD_WORKSPACE_TOKEN,
        title: "Invalid Report",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
