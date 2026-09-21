import {
  type GetKubernetesEfficiencyReportCostsRequest,
  type GetKubernetesEfficiencyReportCostsResponse,
  pathEncode,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/query-kubernetes-efficiency-report-costs";
import { DEFAULT_LIMIT } from "../../../src/tools/structure/constants";
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

const minimalArguments: InferValidators<Validators> = {
  kubernetes_efficiency_report_token: "kbnts_eff_rprt_123",
  start_date: undefined,
  end_date: undefined,
  date_bin: undefined,
  groupings: undefined,
  filter: undefined,
  order: undefined,
  page: undefined,
  limit: undefined,
};

const validArguments: InferValidators<Validators> = {
  kubernetes_efficiency_report_token: "kbnts_eff_rprt_123",
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  date_bin: "week",
  groupings: ["cluster_id", "namespace", "label:app"],
  filter: "kubernetes.namespace = 'production'",
  order: "desc",
  page: 2,
  limit: 250,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "uses report defaults", data: minimalArguments },
  { name: "accepts all query overrides", data: validArguments },
  {
    name: "rejects a limit over the API maximum",
    data: { ...validArguments, limit: 2501 },
    expectedIssues: ["Too big: expected number to be <=2500"],
  },
  {
    name: "rejects an invalid order",
    data: { ...validArguments, order: "newest" as any },
    expectedIssues: ['Invalid option: expected one of "asc"|"desc"'],
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetKubernetesEfficiencyReportCostsResponse = {
  links: { next: "https://api.vantage.sh/v2/kubernetes_efficiency_reports/kbnts_eff_rprt_123/costs?page=3" },
  total_amount: { amount: "120.00", currency: "USD" },
  total_idle_cost: { amount: "40.00", currency: "USD" },
  total_cost_efficiency: "0.66666666666666666667",
  costs: [
    {
      accrued_at: "2026-08-01",
      amount: "120.00",
      idle_cost: "40.00",
      cost_efficiency: "0.66666666666666666667",
      currency: "USD",
      cluster_id: "cluster-1",
      namespace: "production",
      labels: [{ key: "app", value: "payments" }],
    },
  ],
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_123")}/costs`,
        params: {
          start_date: "2026-08-01",
          end_date: "2026-08-31",
          date_bin: "week",
          groupings: "cluster_id,namespace,label:app",
          filter: "kubernetes.namespace = 'production'",
          order: "desc",
          page: 2,
          limit: 250,
        } as GetKubernetesEfficiencyReportCostsRequest,
        method: "GET",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual({
        costs: successData.costs,
        total_amount: successData.total_amount,
        total_idle_cost: successData.total_idle_cost,
        total_cost_efficiency: successData.total_cost_efficiency,
        pagination: { hasNextPage: true, nextPage: 3 },
      });
    },
  },
  {
    name: "successful call with defaults",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_123")}/costs`,
        params: {
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
          groupings: undefined,
          filter: undefined,
          order: undefined,
          page: 1,
          limit: DEFAULT_LIMIT,
        } as GetKubernetesEfficiencyReportCostsRequest,
        method: "GET",
        result: { ok: true, data: { ...successData, links: {} } },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const result = await callExpectingSuccess(minimalArguments);
      expect(result.pagination).toEqual({ hasNextPage: false, nextPage: 0 });
    },
  },
  {
    name: "rejects incomplete date ranges",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...minimalArguments,
        start_date: "2026-08-01",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "unsuccessful API call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_123")}/costs`,
        params: {
          start_date: undefined,
          end_date: undefined,
          date_bin: undefined,
          groupings: undefined,
          filter: undefined,
          order: undefined,
          page: 1,
          limit: DEFAULT_LIMIT,
        } as GetKubernetesEfficiencyReportCostsRequest,
        method: "GET",
        result: { ok: false, errors: [{ message: "Kubernetes cost data is unavailable" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "Kubernetes cost data is unavailable" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
