import {
  type GetBusinessMetricLabelsRequest,
  type GetBusinessMetricLabelsResponse,
  pathEncode,
} from "@vantage-sh/vantage-client";
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
import tool from "./list-business-metric-labels";
import { BUSINESS_METRIC_DATA_LIMIT } from "./schemas";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  business_metric_token: "bsnss_mtrc_3080a050c04104ff",
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      business_metric_token: "bsnss_mtrc_3080a050c04104ff",
      page: undefined,
    },
  },
  {
    name: "blank business metric token",
    data: {
      business_metric_token: "",
      page: 1,
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "page must be positive",
    data: {
      business_metric_token: "bsnss_mtrc_3080a050c04104ff",
      page: 0,
    },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "valid arguments",
    data: validArguments,
  },
];

const successData: GetBusinessMetricLabelsResponse = {
  labels: [{ value: "Enterprise" }, { value: "Prod" }, { value: "Staging" }],
  links: {
    next: "https://api.vantage.sh/v2/business_metrics/bsnss_mtrc_3080a050c04104ff/labels?page=2",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode(validArguments.business_metric_token)}/labels`,
        params: {
          page: 1,
          limit: BUSINESS_METRIC_DATA_LIMIT,
        } as GetBusinessMetricLabelsRequest,
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
        labels: successData.labels,
        pagination: {
          hasNextPage: true,
          nextPage: 2,
        },
      });
    },
  },
  {
    name: "encodes token in path",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_with/slash")}/labels`,
        params: {
          page: 1,
          limit: BUSINESS_METRIC_DATA_LIMIT,
        } as GetBusinessMetricLabelsRequest,
        method: "GET",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      await callExpectingSuccess({
        business_metric_token: "bsnss_mtrc_with/slash",
        page: 1,
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/business_metrics/${pathEncode("bsnss_mtrc_nonexistent")}/labels`,
        params: {
          page: 1,
          limit: BUSINESS_METRIC_DATA_LIMIT,
        } as GetBusinessMetricLabelsRequest,
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
        page: 1,
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Business Metric not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
