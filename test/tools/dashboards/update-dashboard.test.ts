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
  folder_token: undefined,
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
          settings: {
            display_type: "chart",
            grid: { x: 0, y: 4, w: 12, h: 2 },
          },
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

const freeTextGridWidget = {
  widgetable_type: "free_text" as const,
  title: "Notes",
  content: {
    type: "doc" as const,
    content: [{ type: "paragraph", content: [{ type: "text", text: "Dashboard notes" }] }],
  },
  settings: { display_type: "chart" as const, grid: { x: 0, y: 1, w: 12, h: 2 } },
};

const successData: UpdateDashboardResponse = {
  token: "dshbrd_123",
  title: "Updated Dashboard",
  folder_token: null,
  workspace_token: "wrkspc_123",
  widgets: [],
  saved_filter_tokens: ["svd_fltr_123"],
  date_bin: "week",
  date_interval: "this_month",
  created_at: "2023-01-15T10:30:00Z",
  updated_at: "2023-01-16T10:30:00Z",
};

const freeTextGridResponse = {
  ...successData,
  widgets: [{ token: "dshbrd_wdgt_123", ...freeTextGridWidget }],
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
  {
    name: "free text widget grid includes the API-required display type",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
        params: { widgets: [freeTextGridWidget] },
        method: "PUT",
        result: { ok: true, data: freeTextGridResponse },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({ ...minimalValidInputArguments, widgets: [freeTextGridWidget] });
      expect(res).toEqual(freeTextGridResponse);
    },
  },
];

for (const folder_token of ["fldr_destination", null, "", undefined]) {
  const args = { ...minimalValidInputArguments, title: "Moved Dashboard", folder_token };
  const response = {
    ...successData,
    title: "Moved Dashboard",
    folder_token: folder_token === undefined ? "fldr_current" : folder_token || null,
  };
  argumentSchemaTests.push({ name: `folder ${String(folder_token)}`, data: args });
  executionTests.push({
    name: `updates folder ${String(folder_token)} without replacing widgets`,
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
        params: { title: "Moved Dashboard", folder_token },
        method: "PUT",
        result: { ok: true, data: response },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      expect(await callExpectingSuccess(args)).toEqual(response);
    },
  });
}

argumentSchemaTests.push({
  name: "rejects a non-folder destination token",
  data: { ...minimalValidInputArguments, folder_token: "wrkspc_123" },
  expectedIssues: ["Invalid input"],
});

executionTests.push({
  name: "surfaces inaccessible or cross-Workspace destination folders",
  apiCallHandler: requestsInOrder([
    {
      endpoint: `/v2/dashboards/${pathEncode("dshbrd_123")}`,
      params: { folder_token: "fldr_other_workspace" },
      method: "PUT",
      result: { ok: false, errors: [{ message: "Dashboard Folder fldr_other_workspace not found." }] },
    },
  ]),
  handler: async ({ callExpectingMCPUserError }) => {
    const error = await callExpectingMCPUserError({
      ...minimalValidInputArguments,
      folder_token: "fldr_other_workspace",
    });
    expect(error.exception).toEqual({ errors: [{ message: "Dashboard Folder fldr_other_workspace not found." }] });
  },
});

for (const widget of [
  { widgetable_type: "free_text" as const, content: { type: "doc" as const } },
  { widgetable_token: "rprt_123" },
]) {
  argumentSchemaTests.push({
    name: `rejects missing display_type for ${"widgetable_type" in widget ? "free text" : "report"} settings`,
    data: {
      ...minimalValidInputArguments,
      widgets: [{ ...widget, settings: { grid: { x: 0, y: 0, w: 6, h: 2 } } as any }],
    },
    expectedIssues: ['Invalid option: expected one of "table"|"chart"|"kpi"'],
  });
}

argumentSchemaTests.push(
  {
    name: "free text widget without settings uses default layout",
    data: {
      ...minimalValidInputArguments,
      widgets: [{ widgetable_type: "free_text", content: { type: "doc" } }],
    },
  },
  {
    name: "free text settings can omit grid when display_type is supplied",
    data: {
      ...minimalValidInputArguments,
      widgets: [{ widgetable_type: "free_text", content: { type: "doc" }, settings: { display_type: "chart" } }],
    },
  }
);

testTool(tool, argumentSchemaTests, executionTests);
