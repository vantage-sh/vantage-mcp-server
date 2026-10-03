import type { GetDashboardResponse } from "@vantage-sh/vantage-client";
import type { dashboardOutputSchema } from "../../../src/tools/dashboards/schemas";
import type { SchemaTestTableItem } from "../../../src/utils/testing";

export const dashboardResponse = {
  token: "dshbrd_123",
  title: "My Dashboard",
  workspace_token: "wrkspc_123",
  widgets: [
    {
      widgetable_token: "rprt_123",
      title: "Usage KPI",
      settings: {
        display_type: "kpi",
        kpi_calculation: "average",
        kpi_type: "usage",
        kpi_usage_unit: "GB",
      },
    },
    {
      widgetable_token: "rprt_456",
      title: "Cost Chart",
      settings: {
        display_type: "chart",
        kpi_calculation: null,
        kpi_type: null,
        kpi_usage_unit: null,
      },
    },
    {
      widgetable_token: "rprt_789",
      title: "Cost Table",
      settings: { display_type: "table" },
    },
  ],
  saved_filter_tokens: ["svd_fltr_123"],
  date_bin: "cumulative",
  date_interval: "custom",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  created_at: "2026-09-01T10:30:00Z",
  updated_at: "2026-09-02T10:30:00Z",
} satisfies GetDashboardResponse;

export const dashboardOutputSchemaTests: SchemaTestTableItem<typeof dashboardOutputSchema>[] = [
  {
    name: "full response with KPI settings and a custom cumulative range",
    data: dashboardResponse,
  },
  {
    name: "nullable date fields",
    data: { ...dashboardResponse, date_bin: null, date_interval: null, start_date: null, end_date: null },
  },
  {
    name: "optional dates and empty collections",
    data: { ...dashboardResponse, start_date: undefined, end_date: undefined, widgets: [], saved_filter_tokens: [] },
  },
  {
    name: "missing required title",
    data: { ...dashboardResponse, title: undefined as any },
    expectedIssues: ["Invalid input: expected string, received undefined"],
  },
  {
    name: "missing required widget settings",
    data: {
      ...dashboardResponse,
      widgets: [{ widgetable_token: "rprt_123", title: "Cost Chart", settings: undefined as any }],
    },
    expectedIssues: ["Invalid input: expected object, received undefined"],
  },
  {
    name: "invalid date bin",
    data: { ...dashboardResponse, date_bin: "year" as any },
    expectedIssues: ['Invalid option: expected one of "cumulative"|"day"|"week"|"month"'],
  },
  {
    name: "invalid KPI calculation",
    data: {
      ...dashboardResponse,
      widgets: [
        { ...dashboardResponse.widgets[0], settings: { display_type: "kpi", kpi_calculation: "median" as any } },
      ],
    },
    expectedIssues: ['Invalid option: expected one of "sum"|"average"'],
  },
];
