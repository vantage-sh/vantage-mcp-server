import { pathEncode, type UpdateResourceReportResponse } from "@vantage-sh/vantage-client";
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
import tool from "./update-resource-report";

const RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_d881b5362adab1c2";
const BAD_RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_nonexistent";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  filter: undefined,
  columns: undefined,
  folder_token: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  resource_report_token: RESOURCE_REPORT_TOKEN,
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  resource_report_token: RESOURCE_REPORT_TOKEN,
  title: "EC2 Edited Report",
  filter: "resources.provider = 'aws' and resources.type = 'aws_ebs_volume'",
  columns: ["provider", "label", "type", "region", "account"],
  folder_token: "fldr_abc123",
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
    name: "empty resource_report_token",
    data: {
      ...validInputArguments,
      resource_report_token: "",
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

const successData: UpdateResourceReportResponse = {
  token: RESOURCE_REPORT_TOKEN,
  title: "EC2 Edited Report",
  filter: "resources.provider = 'aws' and resources.type = 'aws_ebs_volume'",
  created_at: "2025-08-14T19:13:31Z",
  workspace_token: "wrkspc_2ed2f1a59293a996",
  user_token: null,
  created_by_token: null,
  columns: ["provider", "label", "type", "region", "account"],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/resource_reports/${pathEncode(RESOURCE_REPORT_TOKEN)}`,
        params: {
          title: validInputArguments.title,
          filter: validInputArguments.filter,
          columns: validInputArguments.columns,
          folder_token: validInputArguments.folder_token,
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
        endpoint: `/v2/resource_reports/${pathEncode(BAD_RESOURCE_REPORT_TOKEN)}`,
        params: {
          title: "Invalid Update",
        },
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Resource report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        resource_report_token: BAD_RESOURCE_REPORT_TOKEN,
        title: "Invalid Update",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Resource report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
