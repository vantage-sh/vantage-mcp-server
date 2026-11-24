import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/business-metrics/get-ranked-business-metric-values";
import { requestsInOrder, testTool } from "../../../src/utils/testing";

const args = {
  business_metric_token: "bsnss_mtrc_with/slash",
  start_date: "2024-01-10",
  end_date: "2024-03-10",
  top_labels: 1,
};
const request = {
  endpoint: `/v2/business_metrics/${pathEncode(args.business_metric_token)}/ranked_values` as const,
  method: "GET" as const,
  params: { start_date: args.start_date, end_date: args.end_date, top_labels: 1 },
};
const data = {
  months: ["2024-01-01"],
  monthly_totals: ["15.0000000001"],
  series: [{ label: "alpha", amounts: ["6.0000000001"] }],
};

testTool(
  tool,
  [{ name: "bounded ranking", data: args }],
  [{ name: "monthly values with totals", data }],
  [
    {
      name: "requests the ranked result once and preserves all-label totals and decimal precision",
      apiCallHandler: requestsInOrder([{ ...request, result: { ok: true, data } }]),
      handler: async ({ callExpectingSuccess }) => expect(await callExpectingSuccess(args)).toEqual(data),
    },
    {
      name: "propagates errors from Core",
      apiCallHandler: requestsInOrder([{ ...request, result: { ok: false, errors: ["Invalid range"] } }]),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError(args);
        expect(error.exception.errors).toEqual(["Invalid range"]);
      },
    },
  ]
);
