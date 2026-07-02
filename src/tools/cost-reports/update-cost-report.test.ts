import { pathEncode, type UpdateCostReportResponse } from "@vantage-sh/vantage-client";
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
} from "../utils/testing";
import tool from "./update-cost-report";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const undefineds = {
  title: undefined,
  groupings: undefined,
  filter: undefined,
  saved_filter_tokens: undefined,
  business_metric_tokens_with_metadata: undefined,
  folder_token: undefined,
  settings: undefined,
  previous_period_start_date: undefined,
  previous_period_end_date: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  chart_type: undefined,
  chart_settings: undefined,
  date_bin: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  cost_report_token: "rprt_123",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  cost_report_token: "rprt_123",
  title: "Updated Cost Report",
  groupings: ["provider", "service", "region"] as ["provider", "service", "region"],
  filter: "(costs.provider = 'aws')",
  saved_filter_tokens: ["sf_123", "sf_456"] as ["sf_123", "sf_456"],
  business_metric_tokens_with_metadata: [
    {
      business_metric_token: "bm_123",
      unit_scale: "per_thousand" as const,
      label_filter: ["prod"] as ["prod"],
    },
  ],
  folder_token: "folder_123",
  settings: {
    include_credits: true,
    include_refunds: false,
    include_discounts: true,
    include_tax: true,
    amortize: true,
    unallocated: false,
    aggregate_by: "cost" as const,
    show_previous_period: true,
  },
  previous_period_start_date: "2023-01-01",
  previous_period_end_date: "2023-01-31",
  start_date: "2023-02-01",
  end_date: "2023-02-28",
  chart_type: "pie" as const,
  chart_settings: {
    x_axis_dimension: ["date"],
    y_axis_dimension: "cost",
  },
  date_bin: "week" as const,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  {
    name: "minimal valid arguments",
    data: minimalValidInputArguments,
  },
  {
    name: "all valid arguments",
    data: validInputArguments,
  },
  {
    name: "empty title",
    data: {
      ...validInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  {
    name: "date_interval only",
    data: {
      ...undefineds,
      cost_report_token: "rprt_123",
      date_interval: "last_30_days",
    },
  },
  poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "previous_period_start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "previous_period_end_date", dateValidatorPoisoner),
];

const successData: UpdateCostReportResponse = {
  token: "rprt_123",
  title: "Updated Cost Report",
  folder_token: "folder_123",
  saved_filter_tokens: ["sf_123", "sf_456"],
  business_metric_tokens_with_metadata: [
    {
      business_metric_token: "bm_123",
      unit_scale: "per_thousand",
      calculation_type: "unit_cost",
      label_filter: ["prod"],
    },
  ],
  filter: "(costs.provider = 'aws')",
  groupings: "provider,service,region",
  settings: {
    include_credits: true,
    include_refunds: false,
    include_discounts: true,
    include_tax: true,
    amortize: true,
    unallocated: false,
    aggregate_by: "cost",
    show_previous_period: true,
  },
  created_at: "2023-01-01T00:00:00Z",
  workspace_token: "wt_123",
  previous_period_start_date: "2023-01-01",
  previous_period_end_date: "2023-01-31",
  start_date: "2023-02-01",
  end_date: "2023-02-28",
  default_forecast: { kind: "baseline" },
  date_interval: "this_month",
  chart_type: "pie",
  date_bin: "week",
  chart_settings: {
    y_axis_dimension: "cost",
    x_axis_dimension: ["date"],
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_reports/${pathEncode("rprt_123")}`,
        params: {
          title: "Updated Cost Report",
          groupings: "provider,service,region",
          filter: "(costs.provider = 'aws')",
          saved_filter_tokens: ["sf_123", "sf_456"],
          business_metric_tokens_with_metadata: [
            {
              business_metric_token: "bm_123",
              unit_scale: "per_thousand",
              label_filter: ["prod"],
            },
          ],
          folder_token: "folder_123",
          settings: {
            include_credits: true,
            include_refunds: false,
            include_discounts: true,
            include_tax: true,
            amortize: true,
            unallocated: false,
            aggregate_by: "cost",
            show_previous_period: true,
          },
          previous_period_start_date: "2023-01-01",
          previous_period_end_date: "2023-01-31",
          start_date: "2023-02-01",
          end_date: "2023-02-28",
          chart_type: "pie",
          chart_settings: {
            x_axis_dimension: ["date"],
            y_axis_dimension: "cost",
          },
          date_bin: "week",
        },
        method: "PUT",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validInputArguments);
      expect(res).toEqual(successData);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/cost_reports/${pathEncode("rprt_nonexistent")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Cost report not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_nonexistent",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Cost report not found" }],
      });
    },
  },
  {
    name: "previous period dates must be paired",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_123",
        previous_period_start_date: "2023-01-01",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "previous_period_start_date and previous_period_end_date must both be provided together" }],
      });
    },
  },
  {
    name: "start and end dates must be paired",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_123",
        start_date: "2023-02-01",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    },
  },
  {
    name: "date_interval incompatible with start_date",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        cost_report_token: "rprt_123",
        date_interval: "last_30_days",
        start_date: "2023-02-01",
        end_date: "2023-02-28",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "date_interval cannot be used together with start_date or end_date" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
