import {
  type CreateKubernetesEfficiencyReportRequest,
  type CreateKubernetesEfficiencyReportResponse,
  VANTAGE_KUBERNETES_EFFICIENCY_GROUPINGS,
} from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/kubernetes-efficiency-reports/create-kubernetes-efficiency-report";
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
  workspace_token: "wrkspc_123",
  title: "Kubernetes Efficiency",
  filter: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  aggregated_by: undefined,
  date_bucket: undefined,
  groupings: undefined,
};

const validArguments: InferValidators<Validators> = {
  workspace_token: "wrkspc_123",
  title: "Production Cluster Efficiency",
  filter: "kubernetes.namespace = 'production'",
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  date_interval: undefined,
  aggregated_by: "cost_efficiency",
  date_bucket: "week",
  groupings: ["cluster_id", "namespace", "label:app"],
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "minimal valid arguments", data: minimalArguments },
  { name: "all valid arguments", data: validArguments },
  {
    name: "accepts every built-in grouping",
    data: { ...minimalArguments, groupings: [...VANTAGE_KUBERNETES_EFFICIENCY_GROUPINGS] },
  },
  {
    name: "rejects an empty label grouping",
    data: { ...minimalArguments, groupings: ["label:"] },
    expectedIssues: ["Kubernetes dimensions to group by. Use label:<label_name> to group by a Kubernetes label."],
  },
  {
    name: "rejects duplicate groupings",
    data: { ...minimalArguments, groupings: ["namespace", "namespace"] },
    expectedIssues: ["groupings must contain unique values"],
  },
  {
    name: "rejects more than 100 groupings",
    data: {
      ...minimalArguments,
      groupings: Array.from({ length: 101 }, (_, index) => `label:key-${index}`),
    },
    expectedIssues: ["Too big: expected array to have <=100 items"],
  },
  {
    name: "rejects an empty title",
    data: { ...minimalArguments, title: "" },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData: CreateKubernetesEfficiencyReportResponse = {
  token: "kbnts_eff_rprt_123",
  title: "Production Cluster Efficiency",
  default: false,
  created_at: "2026-09-01T00:00:00Z",
  workspace_token: "wrkspc_123",
  user_token: null,
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  date_interval: null,
  date_bucket: "week",
  aggregated_by: "cost_efficiency",
  groupings: "cluster_id,namespace,label:app",
  filter: "kubernetes.namespace = 'production'",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/kubernetes_efficiency_reports",
        params: validArguments as CreateKubernetesEfficiencyReportRequest,
        method: "POST",
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
    name: "rejects relative and custom dates together",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...validArguments,
        date_interval: "last_month",
      });
      expect(error.exception).toEqual({
        errors: [{ message: "date_interval cannot be used together with start_date or end_date" }],
      });
    },
  },
  {
    name: "rejects reversed dates",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const error = await callExpectingMCPUserError({
        ...validArguments,
        start_date: "2026-09-01",
        end_date: "2026-08-01",
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
        endpoint: "/v2/kubernetes_efficiency_reports",
        params: minimalArguments as CreateKubernetesEfficiencyReportRequest,
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
