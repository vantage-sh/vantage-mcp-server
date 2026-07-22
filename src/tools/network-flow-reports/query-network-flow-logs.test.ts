import type { GetNetworkFlowLogsRequest, GetNetworkFlowLogsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import type { ToolCallContext } from "../structure/registerTool";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./query-network-flow-logs";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;
type ApiResult = { ok: true; data: GetNetworkFlowLogsResponse } | { ok: false; errors: unknown[] };

const savedReportArguments: InferValidators<Validators> = {
  network_flow_report_token: "ntflw_lg_rprt_123",
  workspace_token: undefined,
  filter: undefined,
  date_interval: undefined,
  start_date: undefined,
  end_date: undefined,
  groupings: undefined,
  flow_direction: undefined,
  flow_weight: undefined,
  page: 1,
  limit: 25,
};

const adHocArguments: InferValidators<Validators> = {
  network_flow_report_token: undefined,
  workspace_token: "wrkspc_123",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
  date_interval: "last_14_days",
  start_date: undefined,
  end_date: undefined,
  groupings: ["region", "az_id", "peer_az_id"],
  flow_direction: "all",
  flow_weight: "bytes",
  page: 1,
  limit: 100,
};

const customDateArguments: InferValidators<Validators> = {
  ...adHocArguments,
  date_interval: undefined,
  start_date: "2026-07-01",
  end_date: "2026-07-07",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "saved report query", data: savedReportArguments },
  { name: "ad hoc relative date query", data: adHocArguments },
  { name: "ad hoc custom date query", data: customDateArguments },
  {
    name: "rejects an empty grouping list",
    data: { ...adHocArguments, groupings: [] },
    expectedIssues: ["Too small: expected array to have >=1 items"],
  },
  {
    name: "rejects duplicate groupings",
    data: { ...adHocArguments, groupings: ["region", "region"] },
    expectedIssues: ["groupings must contain unique values"],
  },
  {
    name: "rejects custom as a relative date interval",
    data: { ...adHocArguments, date_interval: "custom" as any },
    expectedIssues: ['Invalid option: expected one of "last_3_days"|"last_7_days"|"last_14_days"|"last_30_days"'],
  },
  poisonOneValue(customDateArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(customDateArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetNetworkFlowLogsResponse = {
  links: {
    self: "https://api.vantage.sh/v2/network_flow_logs?network_flow_report_token=ntflw_lg_rprt_123",
    first: "https://api.vantage.sh/v2/network_flow_logs?network_flow_report_token=ntflw_lg_rprt_123&page=1",
    next: "https://api.vantage.sh/v2/network_flow_logs?network_flow_report_token=ntflw_lg_rprt_123&page=2",
    last: null,
    prev: null,
  },
  flow_weight: "costs",
  sampling: {
    sampled: true,
    max_sampling_rate_percent: 50,
  },
  network_flow_logs: [
    {
      groupings: {
        resource_uuid: {
          value: "resource-123",
          label: "production-web-1",
          provider_resource_token: "prvdr_rsrc_123",
        },
        traffic_category: {
          value: "public",
          label: "public",
          provider_resource_token: null,
        },
      },
      bytes: 200,
      estimated_cost: "2.5",
      currency: "USD",
      sampled_bytes: 100,
      sampled_estimated_cost: "1.25",
    },
  ],
};

function networkFlowLogsApiCall(
  expectedParams: GetNetworkFlowLogsRequest,
  result: ApiResult
): ToolCallContext["callVantageApi"] {
  return (async (endpoint: unknown, params: unknown, method: unknown) => {
    expect(endpoint).toBe("/v2/network_flow_logs");
    expect(params).toEqual(expectedParams);
    expect(method).toBe("GET");
    return result;
  }) as ToolCallContext["callVantageApi"];
}

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "queries a saved report",
    apiCallHandler: networkFlowLogsApiCall(savedReportArguments as GetNetworkFlowLogsRequest, {
      ok: true,
      data: successData,
    }),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(savedReportArguments);
      expect(result).toEqual({
        network_flow_logs: successData.network_flow_logs,
        flow_weight: "costs",
        sampling: successData.sampling,
        pagination: { hasNextPage: true, nextPage: 2 },
      });
    },
  },
  {
    name: "queries ad hoc VQL",
    apiCallHandler: networkFlowLogsApiCall(adHocArguments as GetNetworkFlowLogsRequest, {
      ok: true,
      data: { ...successData, links: {}, flow_weight: "bytes" },
    }),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(adHocArguments);
      expect(result).toEqual({
        network_flow_logs: successData.network_flow_logs,
        flow_weight: "bytes",
        sampling: successData.sampling,
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  },
  {
    name: "requires a saved report token or VQL filter",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...savedReportArguments,
        network_flow_report_token: undefined,
      });
      expect(error.exception).toEqual({
        errors: [{ message: "network_flow_report_token or filter is required" }],
      });
    },
  },
  {
    name: "requires a workspace for ad hoc queries",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...adHocArguments,
        workspace_token: undefined,
      });
      expect(error.exception).toEqual({
        errors: [{ message: "workspace_token is required for an ad hoc Network Flow Log query" }],
      });
    },
  },
  {
    name: "requires dates for ad hoc queries",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...adHocArguments,
        date_interval: undefined,
      });
      expect(error.exception).toEqual({
        errors: [{ message: "date_interval or start_date and end_date are required for an ad hoc query" }],
      });
    },
  },
  {
    name: "requires both custom dates",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...savedReportArguments,
        start_date: "2026-07-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "rejects relative and custom dates together",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...savedReportArguments,
        date_interval: "last_7_days",
        start_date: "2026-07-01",
        end_date: "2026-07-07",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "date_interval cannot be used together with start_date or end_date" }],
      });
    },
  },
  {
    name: "rejects reversed custom dates",
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...savedReportArguments,
        start_date: "2026-07-07",
        end_date: "2026-07-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date must be on or before end_date" }],
      });
    },
  },
  {
    name: "returns Vantage API errors",
    apiCallHandler: networkFlowLogsApiCall(savedReportArguments as GetNetworkFlowLogsRequest, {
      ok: false,
      errors: [{ message: "No Network Flow Log integration exists for this Workspace." }],
    }),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(savedReportArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "No Network Flow Log integration exists for this Workspace." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
