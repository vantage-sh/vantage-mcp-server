import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../utils/testing";
import tool from "./delete-resource-report";

const RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_5270d2a0708fd74f";
const BAD_RESOURCE_REPORT_TOKEN: string = "prvdr_rsrc_rprt_missing";

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
