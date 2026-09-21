import type {
  GetKubernetesEfficiencyReportsRequest,
  GetKubernetesEfficiencyReportsResponse,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/list-kubernetes-efficiency-reports";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../../../src/utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
  q: "production",
  workspace_token: "wrkspc_123",
  page: 2,
  limit: 25,
};

const defaultArguments: InferValidators<Validators> = {
  q: undefined,
  workspace_token: undefined,
  page: undefined,
  limit: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "uses pagination defaults", data: defaultArguments },
  { name: "accepts valid filters and pagination", data: validArguments },
  {
    name: "rejects page zero",
    data: { ...validArguments, page: 0 },
    expectedIssues: ["Too small: expected number to be >=1"],
  },
  {
    name: "rejects a limit over the API maximum",
    data: { ...validArguments, limit: 1001 },
    expectedIssues: ["Too big: expected number to be <=1000"],
  },
];

const successData: GetKubernetesEfficiencyReportsResponse = {
  links: { next: "https://api.vantage.sh/v2/kubernetes_efficiency_reports?page=3" },
  kubernetes_efficiency_reports: [
    {
      token: "kbnts_eff_rprt_123",
      title: "Production Cluster Efficiency",
      default: false,
      created_at: "2026-09-01T00:00:00Z",
      workspace_token: "wrkspc_123",
      user_token: null,
      start_date: null,
      end_date: null,
      date_interval: "last_month",
      date_bucket: "day",
      aggregated_by: "idle_cost",
      groupings: "cluster_id,namespace",
      filter: null,
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/kubernetes_efficiency_reports",
        params: validArguments,
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        kubernetes_efficiency_reports: successData.kubernetes_efficiency_reports,
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "successful call with defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/kubernetes_efficiency_reports",
        params: {
          q: undefined,
          workspace_token: undefined,
          page: 1,
          limit: DEFAULT_LIMIT,
        } as GetKubernetesEfficiencyReportsRequest,
        method: "GET",
        result: { ok: true, data: { kubernetes_efficiency_reports: [], links: {} } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(defaultArguments)).toEqual({
        kubernetes_efficiency_reports: [],
        pagination: { hasNextPage: false, nextPage: 0 },
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/kubernetes_efficiency_reports",
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
