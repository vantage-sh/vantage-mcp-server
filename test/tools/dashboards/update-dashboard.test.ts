import { pathEncode, type UpdateDashboardResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/update-dashboard";
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
  title: undefined,
  widgets: undefined,
  saved_filter_tokens: undefined,
  date_bin: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
  workspace_token: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  dashboard_token: "dshbrd_123",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  dashboard_token: "dshbrd_123",
  title: "Updated Dashboard",
  widgets: [
    {
      widgetable_token: "rprt_123",
      title: "Weekly Sales Report",
      settings: {
        display_type: "chart",
      },
    },
    {
      widgetable_token: "rprt_789",
      title: "Usage KPI",
      settings: {
        display_type: "kpi",
        kpi_calculation: "average",
        kpi_type: "usage",
        kpi_usage_unit: "GB",
      },
    },
  ],
  saved_filter_tokens: ["svd_fltr_123"],
  date_bin: "week",
  date_interval: "this_month",
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
    name: "valid update-only date values",
    data: {
      ...minimalValidInputArguments,
      date_bin: "cumulative",
      date_interval: "",
    },
  },
  {
    name: "empty title",
    data: {
      ...minimalValidInputArguments,
      title: "",
    },
    expectedIssues: ["Too small: expected string to have >=1 characters"],
  },
  poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
  poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
  {
    name: "invalid widget display type",
    data: {
      ...validInputArguments,
      widgets: [
        {
          widgetable_token: "rprt_123",
          settings: {
            display_type: "graph" as any,
          },
        },
      ],
    },
    expectedIssues: ['Invalid option: expected one of "table"|"chart"|"kpi"'],
  },
  {
    name: "invalid kpi_calculation",
    data: {
      ...validInputArguments,
      widgets: [
        {
          widgetable_token: "rprt_123",
          settings: {
            display_type: "kpi",
            kpi_calculation: "median" as any,
          },
        },
      ],
    },
    expectedIssues: ['Invalid option: expected one of "sum"|"average"'],
  },
  {
    name: "valid free text widget with grid",
    data: {
      ...minimalValidInputArguments,
      widgets: [
        {
          widgetable_type: "free_text",
          title: "Notes",
          content: { type: "doc" },
        },
        {
          widgetable_token: "rprt_123",
          settings: {
            display_type: "chart",
            grid: { x: 6, y: 0, w: 6, h: 4 },
          },
        },
      ],
    },
  },
];

const successData: UpdateDashboardResponse = {
  token: "dshbrd_123",
  title: "Updated Dashboard",
  workspace_token: "wrkspc_123",
  widgets: [],
  saved_filter_tokens: ["svd_fltr_123"],
  date_bin: "week",
  date_interval: "this_month",
  created_at: "2023-01-15T10:30:00Z",
  updated_at: "2023-01-16T10:30:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
        params: {
          title: "Updated Dashboard",
          widgets: [
            {
              widgetable_token: "rprt_123",
              title: "Weekly Sales Report",
              settings: { display_type: "chart" },
            },
            {
              widgetable_token: "rprt_789",
              title: "Usage KPI",
              settings: {
                display_type: "kpi",
                kpi_calculation: "average",
                kpi_type: "usage",
                kpi_usage_unit: "GB",
              },
            },
          ],
          saved_filter_tokens: ["svd_fltr_123"],
          date_bin: "week",
          date_interval: "this_month",
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
        endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
        params: {},
        method: "PUT",
        result: {
          ok: false,
          errors: [{ message: "Dashboard not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Dashboard not found" }],
      });
    },
  },
  {
    name: "free text widget cannot include widgetable_token",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        widgets: [
          {
            widgetable_type: "free_text",
            widgetable_token: "rprt_123",
            content: { type: "doc" },
          },
        ],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "widgets[0] must not include widgetable_token when widgetable_type is free_text." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
