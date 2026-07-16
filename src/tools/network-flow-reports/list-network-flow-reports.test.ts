import type { GetNetworkFlowReportsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import { DEFAULT_LIMIT } from "../structure/constants";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./list-network-flow-reports";
import type { TemporaryListNetworkFlowReportsRequest } from "./temporary-network-flow-logs-types";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  q: "cross-az",
  page: 2,
  limit: 25,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "uses pagination defaults",
    data: { q: undefined, page: undefined, limit: undefined },
  },
  {
    name: "accepts valid pagination",
    data: validArguments,
  },
  {
    name: "rejects page zero",
    data: { q: undefined, page: 0, limit: 25 },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "rejects a limit over the API maximum",
    data: { q: undefined, page: 1, limit: 1001 },
    expectedIssues: ["Too big: expected number to be <=1000"],
  },
];

const successData: GetNetworkFlowReportsResponse = {
  links: {
    next: "https://api.vantage.sh/v2/network_flow_reports?page=3",
  },
  network_flow_reports: [
    {
      token: "ntflw_lg_rprt_123",
      title: "Cross-AZ Traffic",
      default: false,
      created_at: "2025-01-31T20:40:43Z",
      workspace_token: "wrkspc_123",
      created_by_token: null,
      start_date: null,
      end_date: null,
      date_interval: "last_7_days",
      groupings: "region,az_id,peer_az_id",
      flow_direction: "egress",
      flow_weight: "costs",
      filter: "network_flow_logs.traffic_category = 'cross_az'",
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/network_flow_reports",
        params: validArguments,
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual({
        network_flow_reports: successData.network_flow_reports,
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "successful call with defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/network_flow_reports",
        params: {
          q: undefined,
          page: 1,
          limit: DEFAULT_LIMIT,
        } as TemporaryListNetworkFlowReportsRequest,
        method: "GET",
        result: { ok: true, data: { network_flow_reports: [], links: {} } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({ q: undefined, page: undefined, limit: undefined });
      expect(result).toEqual({
        network_flow_reports: [],
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/network_flow_reports",
        params: validArguments,
        method: "GET",
        result: { ok: false, errors: [{ message: "Access denied" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(validArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Access denied" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
