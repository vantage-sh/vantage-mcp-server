import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/report-forecasts/delete-report-forecast";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const TOKEN = "rprt_frcst_b6fc93cfbe7bb782";
const ENCODED_TOKEN = "rprt_frcst_a/b";

testTool(
  tool,
  [
    {
      name: "takes report_forecast_token",
      data: {
        report_forecast_token: TOKEN,
      },
    },
    {
      name: "empty token",
      data: {
        report_forecast_token: "",
      },
      expectedIssues: ["Too small: expected string to have >=1 characters"],
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
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
          report_forecast_token: TOKEN,
        });
        expect(res).toEqual({ token: TOKEN });
      },
    },
    {
      name: "encodes token in path",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_forecasts/${pathEncode(ENCODED_TOKEN)}`,
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
          report_forecast_token: ENCODED_TOKEN,
        });
        expect(res).toEqual({ token: ENCODED_TOKEN });
      },
    },
    {
      name: "enterprise entitlement error",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/report_forecasts/${pathEncode(TOKEN)}`,
          params: {},
          method: "DELETE",
          result: {
            ok: false,
            errors: [{ message: "Scenario models are not enabled for this account." }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          report_forecast_token: TOKEN,
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Scenario models are not enabled for this account." }],
        });
      },
    },
  ]
);
