import { type GetBusinessMetricResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { requestsInOrder, testTool } from "../../../src/utils/testing";
import tool from "../../../src/tools/business-metrics/get-business-metric";

const success: GetBusinessMetricResponse = {
  token: "bsnss_mtrc_6d8f14830f9870ac",
  title: "Quo Lux",
  created_by_token: "usr_622d8870faf147bb",
  cost_report_tokens_with_metadata: [],
  import_type: "csv",
  integration_token: "",
};

testTool(
  tool,
  [
    {
      name: "takes business_metric_token",
      data: {
        business_metric_token: "bsnss_mtrc_6d8f14830f9870ac",
      },
    },
  ],
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_6d8f14830f9870ac")}`,
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
          business_metric_token: "bsnss_mtrc_6d8f14830f9870ac",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "encodes token in path",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_with/slash")}`,
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
          business_metric_token: "bsnss_mtrc_with/slash",
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_nonexistent")}`,
          params: {},
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "Business Metric not found" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          business_metric_token: "bsnss_mtrc_nonexistent",
        });
        expect(err.exception).toEqual({
          errors: [{ message: "Business Metric not found" }],
        });
      },
    },
  ]
);
