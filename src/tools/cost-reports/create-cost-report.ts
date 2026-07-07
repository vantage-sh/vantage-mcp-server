import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { dateIntervalOptions } from "../utils/dateIntervalOptions";
import dateValidator from "../utils/dateValidator";
import {
  businessMetricTokenForCreate,
  chartSettings,
  chartTypes,
  costReportSettingsForCreate,
  dateBins,
} from "./schemas";

const description = `
Create a new Cost Report in Vantage.

Cost Reports are saved queries that can be used to track and analyze spending over time. They can be filtered using VQL (Vantage Query Language) and configured with various display options.

VQL Filtering Guide:
All costs originate from a Cost Provider (generally a cloud company like AWS, Azure, Datadog) and then filter on a service that they provide (like EC2, S3, etc).
A cost provider is required on every VQL query.
VQL is always in parenthesis. Always use single quotes around names that are being queried.

Basic VQL Syntax:
- Query on a cost provider: (costs.provider = '<provider name>')
- Query on a service: (costs.provider = '<provider name>' AND costs.service = '<service name>')
- Multiple providers: ((costs.provider = 'aws') OR (costs.provider = 'azure'))
- Multiple services: (costs.provider = 'aws' AND costs.service IN ('AWSQueueService', 'AWSLambda'))
- Filter by region: (costs.provider = 'aws' AND costs.region = 'us-east-1')
- Filter by account: (costs.provider = 'aws' AND costs.account_id = '1000000717')

Tag Filtering:
- Tag with specific value: (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')
- Any value of a tag: (costs.provider = 'aws' AND tags.name = 'environment')
- Resources without a tag: (costs.provider = 'aws' AND tags.name = NULL)
- Multiple tag values: (costs.provider = 'aws' AND tags.name = 'environment' AND (tags.value = 'dev' OR tags.value = 'staging'))

Use get-myself to find available workspaces and list-cost-providers/list-cost-services to find valid provider and service names for your VQL queries.
`.trim();

export default registerTool({
  name: "create-cost-report",
  title: "Create Cost Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("Title for the new Cost Report"),
    workspace_token: z
      .string()
      .optional()
      .describe(
        "The token of the Workspace to add the Cost Report to. Ignored if 'folder_token' is set. Required if the API token is associated with multiple Workspaces."
      ),
    groupings: z
      .array(z.string())
      .optional()
      .transform((v) => v?.join(","))
      .describe(
        "Grouping values for aggregating costs on the report. Valid groupings: account_id, billing_account_id, charge_type, cost_category, cost_subcategory, provider, region, resource_id, service, tagged, tag:<tag_value>."
      ),
    filter: z.string().optional().describe("VQL filter to apply to the Cost Report"),
    saved_filter_tokens: z
      .array(z.string())
      .optional()
      .describe("The tokens of the SavedFilters to apply to the CostReport."),
    business_metric_tokens_with_metadata: z
      .array(businessMetricTokenForCreate)
      .optional()
      .describe("The tokens for any BusinessMetrics to attach to the CostReport, and the unit scale."),
    folder_token: z
      .string()
      .optional()
      .describe(
        "The token of the Folder to add the CostReport to. Determines the Workspace the report is assigned to."
      ),
    settings: costReportSettingsForCreate.optional().describe("Report settings."),
    previous_period_start_date: dateValidator(
      "The previous period start date of the CostReport. ISO 8601 Formatted."
    ).optional(),
    previous_period_end_date: dateValidator(
      "The previous period end date of the CostReport. ISO 8601 Formatted."
    ).optional(),
    start_date: dateValidator(
      "The start date of the CostReport. ISO 8601 Formatted. Incompatible with 'date_interval' parameter."
    ).optional(),
    end_date: dateValidator(
      "The end date of the CostReport. ISO 8601 Formatted. Incompatible with 'date_interval' parameter, required with 'start_date'."
    ).optional(),
    date_interval: z
      .enum(dateIntervalOptions)
      .optional()
      .describe(
        "The date interval of the CostReport. Incompatible with 'start_date' and 'end_date' parameters. Defaults to 'this_month' if start_date and end_date are not provided."
      ),
    chart_type: z
      .enum(chartTypes)
      .optional()
      .describe("The chart type to use in the CostReport. Defaults to 'line' if not provided."),
    date_bin: z
      .enum(dateBins)
      .optional()
      .describe("The date bin of the CostReport. Defaults to 'cumulative' if not provided."),
    chart_settings: chartSettings.optional().describe("Report chart settings."),
  },
  async execute(args, ctx) {
    const res = await ctx.callVantageApi(
      "/v2/cost_reports",
      {
        ...args,
        previous_period_end_date: args.previous_period_end_date as any,
        end_date: args.end_date as any,
      },
      "POST"
    );
    if (!res.ok) {
      throw new MCPUserError({ errors: res.errors });
    }
    return res.data;
  },
});
