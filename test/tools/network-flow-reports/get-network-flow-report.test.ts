import { type GetNetworkFlowReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/network-flow-reports/get-network-flow-report";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "accepts a report token",
    data: { network_flow_report_token: "ntflw_lg_rprt_123" },
  },
  {
    name: "rejects an empty report token",
    data: { network_flow_report_token: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
];

const successData: GetNetworkFlowReportResponse = {
  token: "ntflw_lg_rprt_123",
  title: "Cross-AZ Traffic",
  default: false,
  created_at: "2025-01-31T20:40:43Z",
  workspace_token: "wrkspc_123",
  created_by_token: null,
  start_date: "2025-01-01",
  end_date: "2025-01-31",
  date_interval: "custom",
  groupings: "region,az_id,peer_az_id",
  flow_direction: "egress",
  flow_weight: "costs",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call encodes the report token",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg/rprt_123")}`,
        params: {},
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({ network_flow_report_token: "ntflw_lg/rprt_123" });
      expect(result).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg_rprt_missing")}`,
        params: {},
        method: "GET",
        result: { ok: false, errors: [{ message: "Network Flow Report not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        network_flow_report_token: "ntflw_lg_rprt_missing",
      });
      expect(error.exception).toEqual({ errors: [{ message: "Network Flow Report not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
