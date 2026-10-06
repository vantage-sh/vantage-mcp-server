import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/create-dashboard";
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
  widgets: undefined,
  saved_filter_tokens: undefined,
  date_bin: undefined,
  start_date: undefined,
  end_date: undefined,
  date_interval: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "My Dashboard",
  workspace_token: "wrkspc_123",
};

const validInputArguments: InferValidators<Validators> = {
  ...undefineds,
  title: "New Dashboard",
  workspace_token: "wrkspc_123",
  widgets: [
    {
      widgetable_token: "rprt_123",
      title: "Weekly Sales Report",
      settings: {
        display_type: "chart",
      },
    },
    {
      widgetable_token: "rprt_456",
      settings: {
        display_type: "table",
      },
    },
    {
      widgetable_token: "rprt_789",
      title: "Monthly Cost KPI",
      settings: {
        display_type: "kpi",
        kpi_calculation: "sum",
        kpi_type: "cost",
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
    name: "invalid kpi_type",
    data: {
      ...validInputArguments,
      widgets: [
        {
          widgetable_token: "rprt_123",
          settings: {
            display_type: "kpi",
            kpi_type: "spend" as any,
          },
        },
      ],
    },
    expectedIssues: ['Invalid option: expected one of "cost"|"usage"|"count"|"business_metric"'],
  },
  {
    name: "valid free text widget with grid",
    data: {
      ...minimalValidInputArguments,
      widgets: [
        {
          widgetable_type: "free_text",
          title: "Notes",
          content: {
            type: "doc",
            content: [{ type: "paragraph", text: "Context for this dashboard." }],
          },
          settings: {
            grid: { x: 6, y: 4, w: 6, h: 2 },
          },
        },
        {
          widgetable_token: "rprt_123",
          settings: {
            display_type: "chart",
            grid: { x: 0, y: 0, w: 6, h: 4 },
          },
        },
      ],
    },
  },
  {
    name: "invalid widgetable_type",
    data: {
      ...minimalValidInputArguments,
      widgets: [
        {
          widgetable_type: "markdown" as any,
          content: { type: "doc" },
        },
      ],
    },
    expectedIssues: ['Invalid input: expected "free_text"'],
  },
  {
    name: "invalid free text content root",
    data: {
      ...minimalValidInputArguments,
      widgets: [
        {
          widgetable_type: "free_text",
          content: { type: "paragraph" as any },
        },
      ],
    },
    expectedIssues: ['Invalid input: expected "doc"'],
  },
];

const successData = {
  token: "dshbrd_123",
  title: "New Dashboard",
  workspace_token: "wrkspc_123",
  widgets: [],
  saved_filter_tokens: [],
  date_bin: "day" as const,
  date_interval: "this_month" as const,
  created_at: "2023-01-15T10:30:00Z",
  updated_at: "2023-01-15T10:30:00Z",
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboards",
        params: validInputArguments,
        method: "POST",
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
        endpoint: "/v2/dashboards",
        params: minimalValidInputArguments,
        method: "POST",
        result: {
          ok: false,
          errors: [{ message: "Workspace not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "Workspace not found" }],
      });
    },
  },
  {
    name: "free text widget requires content",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        widgets: [{ widgetable_type: "free_text", title: "Notes" }],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "widgets[0] requires content when widgetable_type is free_text." }],
      });
    },
  },
  {
    name: "report-backed widget requires widgetable_token",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        widgets: [{ title: "Missing resource" }],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "widgets[0] requires widgetable_token." }],
      });
    },
  },
  {
    name: "free text widget grid omits display type",
    apiCallHandler: requestsInOrder([
      {
        endpoint: "/v2/dashboards",
        params: {
          ...minimalValidInputArguments,
          widgets: [
            {
              widgetable_type: "free_text",
              title: "Notes",
              content: { type: "doc" },
              settings: { grid: { x: 0, y: 1, w: 12, h: 2 } },
            },
          ],
        },
        method: "POST",
        result: {
          ok: true,
          data: successData,
        },
      },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess({
        ...minimalValidInputArguments,
        widgets: [
          {
            widgetable_type: "free_text",
            title: "Notes",
            content: { type: "doc" },
            settings: { grid: { x: 0, y: 1, w: 12, h: 2 } },
          },
        ],
      });
      expect(res).toEqual(successData);
    },
  },
  {
    name: "free text widget rejects display settings",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        widgets: [
          {
            widgetable_type: "free_text",
            content: { type: "doc" },
            settings: {
              display_type: "chart",
              grid: { x: 0, y: 0, w: 6, h: 2 },
            },
          },
        ],
      });
      expect(err.exception).toEqual({
        errors: [
          {
            message:
              "widgets[0] must not include settings.display_type when widgetable_type is free_text. Set settings.grid to place the widget.",
          },
        ],
      });
    },
  },
  {
    name: "report widget settings require display_type",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...minimalValidInputArguments,
        widgets: [
          {
            widgetable_token: "rprt_123",
            settings: { grid: { x: 0, y: 0, w: 4, h: 3 } },
          },
        ],
      });
      expect(err.exception).toEqual({
        errors: [{ message: "widgets[0] requires settings.display_type." }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
