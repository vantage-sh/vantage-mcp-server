import {
  pathEncode,
  type UpdateKubernetesEfficiencyReportRequest,
  type UpdateKubernetesEfficiencyReportResponse,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/update-kubernetes-efficiency-report";
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

const minimalArguments: InferValidators<Validators> = {
  kubernetes_efficiency_report_token: "kbnts_eff_rprt_123",
  title: undefined,
  filter: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  aggregated_by: undefined,
  date_bucket: undefined,
  groupings: undefined,
};

const validArguments: InferValidators<Validators> = {
  kubernetes_efficiency_report_token: "kbnts_eff_rprt_123",
  title: "Updated Kubernetes Efficiency",
  filter: "kubernetes.namespace = 'payments'",
  start_date: undefined,
  end_date: undefined,
  date_interval: "last_30_days",
  aggregated_by: "idle_cost",
  date_bucket: "day",
  groupings: ["cluster_id", "namespace", "label:team"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "rejects an invalid aggregation",
    data: { ...validArguments, aggregated_by: "usage" as any },
    expectedIssues: ['Invalid option: expected one of "idle_cost"|"amount"|"cost_efficiency"'],
  },
  {
    name: "rejects an unsupported grouping",
    data: { ...validArguments, groupings: ["account_id"] },
    expectedIssues: ["Kubernetes dimensions to group by. Use label:<label_name> to group by a Kubernetes label."],
  },
];

const successData: UpdateKubernetesEfficiencyReportResponse = {
  token: "kbnts_eff_rprt_123",
  title: "Updated Kubernetes Efficiency",
  default: false,
  created_at: "2026-09-01T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: null,
  start_date: null,
  end_date: null,
  date_interval: "last_30_days",
  date_bucket: "day",
  aggregated_by: "idle_cost",
  groupings: "cluster_id,namespace,label:team",
  filter: "kubernetes.namespace = 'payments'",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_123")}`,
        params: {
          title: "Updated Kubernetes Efficiency",
          filter: "kubernetes.namespace = 'payments'",
          start_date: undefined,
          end_date: undefined,
          date_interval: "last_30_days",
          aggregated_by: "idle_cost",
          date_bucket: "day",
          groupings: ["cluster_id", "namespace", "label:team"],
        } as UpdateKubernetesEfficiencyReportRequest,
        method: "PUT",
        result: { ok: true, data: successData },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(validArguments)).toEqual(successData);
    },
  },
  {
    name: "rejects incomplete custom dates",
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
        endpoint: `/v2/kubernetes_efficiency_reports/${pathEncode("kbnts_eff_rprt_123")}`,
        params: {
          title: undefined,
          filter: undefined,
          start_date: undefined,
          end_date: undefined,
          date_interval: undefined,
          aggregated_by: undefined,
          date_bucket: undefined,
          groupings: undefined,
        } as UpdateKubernetesEfficiencyReportRequest,
        method: "PUT",
        result: { ok: false, errors: [{ message: "Kubernetes Efficiency Report not found" }] },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError(minimalArguments);
      expect(error.exception).toEqual({
        errors: [{ message: "Kubernetes Efficiency Report not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
