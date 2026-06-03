import { type GetResourceReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../utils/testing";
import tool from "./get-resource-report";

const RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_5270d2a0708fd74f";
const BAD_RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_nonexistent";

const success: GetResourceReportResponse = {
  "token": RESOURCE_REPORT_TOKEN,
  "title": "Resource Report 84541657",
  "filter": "(resources.provider = 'aws')",
  "created_at": "2025-08-14T19:13:30Z",
  "workspace_token": "wrkspc_2ed2f1a59293a996",
  "user_token": null,
  "created_by_token": null,
  "columns": [
    "provider",
    "label",
    "accrued_costs",
    "recommendation_savings",
    "resource",
    "type",
    "region",
    "account"
  ]
};

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
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/${pathEncode(RESOURCE_REPORT_TOKEN)}`,
          params: {},
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          resource_report_token: RESOURCE_REPORT_TOKEN,
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/${pathEncode(BAD_RESOURCE_REPORT_TOKEN)}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Resource report not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          resource_report_token: BAD_RESOURCE_REPORT_TOKEN,
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Resource report not found" }],
        });
      },
    },
  ]
);
