import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/resource-reports/delete-resource-report";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_5270d2a0708fd74f";
const BAD_RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_missing";

const validOutput = { token: RESOURCE_REPORT_TOKEN };

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource token",
    data: { ...validOutput, token: 123 as any },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(
  tool,
  [
    {
      name: "takes resource_report_token",
      data: {
        resource_report_token: RESOURCE_REPORT_TOKEN,
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/${pathEncode(RESOURCE_REPORT_TOKEN)}`,
          params: {},
          method: "DELETE",
          result: {
            ok: true,
            data: undefined,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          resource_report_token: RESOURCE_REPORT_TOKEN,
        });
        expect(res).toEqual({ token: RESOURCE_REPORT_TOKEN });
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/${pathEncode(BAD_RESOURCE_REPORT_TOKEN)}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "resource report not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          resource_report_token: BAD_RESOURCE_REPORT_TOKEN,
        });
        expect(err.exception).toEqual({
          errors: [{ message: "resource report not found" }],
        });
      },
    },
  ]
);
