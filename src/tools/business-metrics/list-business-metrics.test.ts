import type { GetBusinessMetricsResponse } from "@vantage-sh/vantage-client";
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
import tool from "./list-business-metrics";
import { BUSINESS_METRICS_LIST_LIMIT } from "./schemas";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "default page",
    data: {
      page: undefined,
    },
  },
  {
    name: "valid page number",
    data: validArguments,
  },
];

const successData: GetBusinessMetricsResponse = {
  business_metrics: [
    {
      token: "bsnss_mtrc_124dc3483510ac35",
      title: "Business Metric",
      created_by_token: "usr_80447a58ff9821dd",
      cost_report_tokens_with_metadata: [],
      import_type: "csv",
      integration_token: "",
    },
    {
      token: "bsnss_mtrc_2534c89d90b714f7",
      title: "AWS Metric",
      created_by_token: "usr_752202a1bb7c9a70",
      cost_report_tokens_with_metadata: [],
      import_type: "cloudwatch",
      integration_token: "accss_crdntl_742fd1207f8b6816",
      cloudwatch_fields: {
        stat: "Maximum",
        region: "us-east-1",
        namespace: "AWS/EC2",
        metric_name: "CPUUtilization",
        dimensions: [{ name: "InstanceId", value: "i-06105d0faad66r97" }],
        label_dimension: null,
      },
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/business_metrics",
        params: {
          page: 1,
          limit: BUSINESS_METRICS_LIST_LIMIT,
        },
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
        business_metrics: successData.business_metrics,
        pagination: {
          hasNextPage: false,
          nextPage: 0,
        },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/business_metrics",
        params: {
          page: 1,
          limit: BUSINESS_METRICS_LIST_LIMIT,
        },
        method: "GET",
        result: {
          ok: false,
          errors: [{ message: "Access denied" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Access denied" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
