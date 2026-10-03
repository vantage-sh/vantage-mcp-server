import type { GetResourceReportColumnsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/resource-reports/list-resource-report-columns";
import {
  type ExtractOutputSchema,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

const success: GetResourceReportColumnsResponse = {
  columns: [
    "provider",
    "label",
    "accruedCosts",
    "recommendationSavings",
    "resource",
    "type",
    "region",
    "account",
    "provisionedState",
    "maxCpu",
    "maxMemory",
    "maxGpu",
    "maxGpuMemory",
    "maxEbsReadOpsPerSecond",
    "maxEbsWriteOpsPerSecond",
    "maxEbsReadBytesPerSecond",
    "maxEbsWriteBytesPerSecond",
    "maxDiskReadOpsPerSecond",
    "maxDiskWriteOpsPerSecond",
    "maxDiskReadBytesPerSecond",
    "maxDiskWriteBytesPerSecond",
    "maxNetworkInBytesPerSecond",
    "maxNetworkOutBytesPerSecond",
    "maxNetworkPacketsInPerSecond",
    "maxNetworkPacketsOutPerSecond",
    "maxNetworkThroughputDailyByte",
    "maxDatabaseConnections",
    "instanceId",
    "imageId",
    "vpcId",
    "subnetId",
    "publicIpAddress",
    "privateIpAddress",
    "publicDnsName",
    "instanceType",
    "instanceFamily",
    "platform",
    "spotInstanceRequestId",
    "launchTime",
    "instanceLifecycle",
    "state",
    "name",
    "platformType",
    "platformDetails",
    "spotInfo",
    "spotPrice",
    "datadogAgentInstalled",
    "networkInterfaces",
    "tags",
  ],
};

const RESOURCE_TYPE: string = "aws_instance";
const INVALID_RESOURCE_TYPE: string = "invalid";

const validOutput = success;

const outputSchemaTests: SchemaTestTableItem<ExtractOutputSchema<typeof tool>>[] = [
  { name: "valid response", data: validOutput },
  {
    name: "rejects a non-string resource report column",
    data: { ...validOutput, columns: [123 as any] },
    expectedIssues: ["Invalid input: expected string, received number"],
  },
];

testTool(
  tool,
  [
    {
      name: "takes resource_type",
      data: {
        resource_type: RESOURCE_TYPE,
      },
    },
  ],
  outputSchemaTests,
  [
    {
      name: "successful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/columns`,
          params: { resource_type: RESOURCE_TYPE },
          method: "GET",
          result: {
            ok: true,
            data: success,
          },
        },
      ]),
      handler: async ({ callExpectingSuccess }) => {
        const res = await callExpectingSuccess({
          resource_type: RESOURCE_TYPE,
        });
        expect(res).toEqual(success);
      },
    },
    {
      name: "unsuccessful call",
      apiCallHandler: requestsInOrder([
        {
          endpoint: `/v2/resource_reports/columns`,
          params: { resource_type: INVALID_RESOURCE_TYPE },
          method: "GET",
          result: {
            ok: false,
            errors: [{ message: "resource_type is missing" }],
          },
        },
      ]),
      handler: async ({ callExpectingMCPUserError }) => {
        const err = await callExpectingMCPUserError({
          resource_type: INVALID_RESOURCE_TYPE,
        });
        expect(err.exception).toEqual({
          errors: [{ message: "resource_type is missing" }],
        });
      },
    },
  ]
);
