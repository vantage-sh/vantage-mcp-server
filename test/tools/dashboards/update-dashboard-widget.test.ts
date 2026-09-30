import { pathEncode, type UpdateDashboardWidgetResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "../../../src/tools/dashboards/update-dashboard-widget";
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

const undefineds = {
  widgetable_token: undefined,
  title: undefined,
  settings: undefined,
};

const minimalValidInputArguments: InferValidators<Validators> = {
  ...undefineds,
  widget_token: "dshbrd_wdgt_123",
};

const validInputArguments: InferValidators<Validators> = {
  widget_token: "dshbrd_wdgt_123",
  widgetable_token: "rprt_789",
  title: "Usage KPI",
  settings: {
    display_type: "kpi",
    kpi_calculation: "average",
    kpi_type: "usage",
    kpi_usage_unit: "hours",
  },
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
    name: "rejects a dashboard token",
    data: {
      ...minimalValidInputArguments,
      widget_token: "dshbrd_123",
    },
    expectedIssues: ["Must be a Dashboard Widget token (dshbrd_wdgt_*)"],
  },
  {
    name: "rejects an invalid display type",
    data: {
      ...minimalValidInputArguments,
      settings: {
        display_type: "gauge" as never,
      },
    },
    expectedIssues: ['Invalid option: expected one of "table"|"chart"|"kpi"'],
  },
];

const successData: UpdateDashboardWidgetResponse = {
  token: "dshbrd_wdgt_123",
  widgetable_token: "rprt_789",
  title: "Usage KPI",
  settings: {
    display_type: "kpi",
    kpi_calculation: "average",
    kpi_type: "usage",
    kpi_usage_unit: "hours",
  },
};

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/widgets/${pathEncode("dshbrd_wdgt_123")}`,
        params: {
          widgetable_token: "rprt_789",
          title: "Usage KPI",
          settings: {
            display_type: "kpi",
            kpi_calculation: "average",
            kpi_type: "usage",
            kpi_usage_unit: "hours",
          },
        },
        method: "PATCH",
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
    name: "requires a field to update",
    apiCallHandler: requestsInOrder([]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(minimalValidInputArguments);
      expect(err.exception).toEqual({
        errors: [{ message: "At least one Dashboard Widget field must be provided." }],
      });
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      {
        endpoint: `/v2/widgets/${pathEncode("dshbrd_wdgt_123")}`,
        params: {
          title: "Usage KPI",
        },
        method: "PATCH",
        result: {
          ok: false,
          errors: [{ message: "Widget not found" }],
        },
      },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError({
        ...undefineds,
        widget_token: "dshbrd_wdgt_123",
        title: "Usage KPI",
      });
      expect(err.exception).toEqual({
        errors: [{ message: "Widget not found" }],
      });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
