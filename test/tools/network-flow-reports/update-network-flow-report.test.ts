import {
  pathEncode,
  type UpdateNetworkFlowReportRequest,
  type UpdateNetworkFlowReportResponse,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
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
import tool from "../../../src/tools/network-flow-reports/update-network-flow-report";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
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
  network_flow_report_token: "ntflw_lg_rprt_123",
};

const validArguments: InferValidators<Validators> = {
  network_flow_report_token: "ntflw_lg_rprt_123",
  title: "Updated Cross-AZ Egress",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
  start_date: "2025-02-01",
  end_date: "2025-02-28",
  date_interval: "custom",
  groupings: ["region", "vpc_id", "peer_vpc_id"],
  flow_direction: "egress",
  flow_weight: "costs",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "rejects an empty report token",
    data: { ...minimalArguments, network_flow_report_token: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "rejects an empty title",
    data: { ...minimalArguments, title: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "accepts expanded date intervals and all traffic directions",
    data: {
      ...minimalArguments,
      date_interval: "last_14_days" as any,
      flow_direction: "all" as any,
    },
  },
  {
    name: "rejects an unsupported flow direction",
    data: { ...minimalArguments, flow_direction: "both" as any },
    expectedIssues: ['Invalid option: expected one of "all"|"ingress"|"egress"'],
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: UpdateNetworkFlowReportResponse = {
  token: "ntflw_lg_rprt_123",
  title: "Updated Cross-AZ Egress",
  default: false,
  created_at: "2025-01-31T20:40:43Z",
  workspace_token: "wrkspc_123",
  created_by_token: "team_123",
  start_date: "2025-02-01",
  end_date: "2025-02-28",
  date_interval: "custom",
  groupings: "region,vpc_id,peer_vpc_id",
  flow_direction: "egress",
  flow_weight: "costs",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
};

const requestBody: UpdateNetworkFlowReportRequest = {
  title: "Updated Cross-AZ Egress",
  filter: "network_flow_logs.traffic_category = 'cross_az'",
  start_date: "2025-02-01",
  end_date: "2025-02-28",
  date_interval: "custom",
  groupings: ["region", "vpc_id", "peer_vpc_id"],
  flow_direction: "egress",
  flow_weight: "costs",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call encodes the report token",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg/rprt_123")}`,
        params: requestBody,
        method: "PUT",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess({
        ...validArguments,
        network_flow_report_token: "ntflw_lg/rprt_123",
      });
      expect(result).toEqual(successData);
    },
  },
  {
    name: "rejects an incomplete custom date range",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        end_date: "2025-02-28",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "rejects custom dates without an explicit custom interval",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        start_date: "2025-02-01",
        end_date: "2025-02-28",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date require date_interval to be custom" }],
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
        start_date: "2025-02-28",
        end_date: "2025-02-01",
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
        endpoint: `/v2/network_flow_reports/${pathEncode("ntflw_lg_rprt_123")}`,
        params: {},
        method: "PUT",
        result: { ok: false, errors: [{ message: "Network Flow Report not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalArguments);
      expect(error.exception).toEqual({ errors: [{ message: "Network Flow Report not found" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
