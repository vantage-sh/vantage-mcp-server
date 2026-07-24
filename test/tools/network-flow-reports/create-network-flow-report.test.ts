import type { CreateNetworkFlowReportRequest, CreateNetworkFlowReportResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/network-flow-reports/create-network-flow-report";
import {
  dateValidatorPoisoner,
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  poisonOneValue,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  filter: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  groupings: undefined,
  flow_direction: undefined,
  flow_weight: undefined,
};

const minimalArguments: InferValidators<Validators> = {
  ...undefineds,
  workspace_token: "wrkspc_123",
  title: "Network Traffic",
};

const validArguments: InferValidators<Validators> = {
  workspace_token: "wrkspc_123",
  title: "Cross-AZ Egress",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
  start_date: "2025-01-01",
  end_date: "2025-01-31",
  date_interval: "custom",
  groupings: ["region", "az_id", "peer_az_id"],
  flow_direction: "egress",
  flow_weight: "bytes",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "rejects an empty workspace token",
    data: { ...minimalArguments, workspace_token: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects an empty title",
    data: { ...minimalArguments, title: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects an empty filter",
    data: { ...minimalArguments, filter: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "accepts expanded date intervals and all traffic directions",
    data: {
      ...minimalArguments,
      date_interval: "last_30_days" as any,
      flow_direction: "all" as any,
    },
  },
  {
    name: "rejects an unsupported grouping",
    data: { ...minimalArguments, groupings: ["provider"] as any },
    expectedIssues: [
      'Invalid option: expected one of "account_id"|"az_id"|"dstaddr"|"dsthostname"|"flow_direction"|"interface_id"|"instance_id"|"peer_resource_uuid"|"peer_account_id"|"peer_vpc_id"|"peer_region"|"peer_az_id"|"peer_subnet_id"|"peer_interface_id"|"peer_instance_id"|"region"|"resource_uuid"|"srcaddr"|"srchostname"|"subnet_id"|"traffic_category"|"traffic_path"|"vpc_id"',
    ],
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: CreateNetworkFlowReportResponse = {
  token: "ntflw_lg_rprt_123",
  title: "Cross-AZ Egress",
  default: false,
  created_at: "2025-01-31T20:40:43Z",
  workspace_token: "wrkspc_123",
  created_by_token: "team_123",
  start_date: "2025-01-01",
  end_date: "2025-01-31",
  date_interval: "custom",
  groupings: "region,az_id,peer_az_id",
  flow_direction: "egress",
  flow_weight: "bytes",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/network_flow_reports",
        params: validArguments as CreateNetworkFlowReportRequest,
        method: "POST",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(validArguments);
      expect(result).toEqual(successData);
    },
  },
  {
    name: "rejects an incomplete custom date range",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        start_date: "2025-01-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "rejects dates with a non-custom interval",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        start_date: "2025-01-01",
        end_date: "2025-01-31",
        date_interval: "last_7_days",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date require date_interval to be custom" }],
      });
    },
  },
  {
    name: "rejects dates without an explicit custom interval",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date require date_interval to be custom" }],
      });
    },
  },
  {
    name: "rejects custom interval without dates",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        date_interval: "custom",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "custom date_interval requires start_date and end_date" }],
      });
    },
  },
  {
    name: "rejects reversed custom dates",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        date_interval: "custom",
        start_date: "2025-01-31",
        end_date: "2025-01-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date must be on or before end_date" }],
      });
    },
  },
  {
    name: "unsuccessful API call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/network_flow_reports",
        params: {
          ...minimalArguments,
          date_interval: "last_7_days",
          flow_weight: "costs",
        } as CreateNetworkFlowReportRequest,
        method: "POST",
        result: { ok: false, errors: [{ message: "Workspace not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Workspace not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
