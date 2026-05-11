import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";

const description = `
Create a new Financial Commitment Report in Vantage.

Financial Commitment Reports track committed spend and on-demand costs over time. They can be filtered
using VQL and grouped by dimensions such as commitment type, service, region, or tags.

VQL Filtering Guide:
Financial Commitment Report VQL uses the financial_commitments namespace. A provider filter should be
included in each query, and string values should be wrapped in single quotes.

Basic VQL Syntax:
- Query on a provider: (financial_commitments.provider = 'aws')
- Query on a service: (financial_commitments.provider = 'aws' AND financial_commitments.service = 'AmazonEC2')
- Multiple services: (financial_commitments.provider = 'aws' AND financial_commitments.service IN ('AmazonEC2','AmazonRDS'))
- Filter by billing account: (financial_commitments.provider = 'aws' AND financial_commitments.provider_account_id = '123456789012')
- Filter by region: (financial_commitments.provider = 'aws' AND financial_commitments.region = 'us-east-1')
- Filter by tag: (financial_commitments.provider = 'aws' AND financial_commitments.resource_tags->>'environment' = 'production')

Use get-myself to find available workspaces. Use the VQL for Financial Commitment Reports resource for
the full list of available financial_commitments fields and examples.
`.trim();

type CreateFinancialCommitmentReportRequest = RequestBodyForPathAndMethod<"/v2/financial_commitment_reports", "POST">;

const intervalOptions = [
  "this_month",
  "last_7_days",
  "last_30_days",
  "last_month",
  "last_3_months",
  "last_6_months",
  "custom",
  "last_12_months",
  "last_24_months",
  "last_36_months",
  "next_month",
  "next_3_months",
  "next_6_months",
  "next_12_months",
  "year_to_date",
  "last_3_days",
  "last_14_days",
] as const;

const financialCommitmentGroupings = [
  "provider",
  "service",
  "resource_account_id",
  "provider_account_id",
  "commitment_type",
  "commitment_id",
  "cost_type",
  "cost_category",
  "cost_sub_category",
  "instance_type",
  "region",
] as const;

const groupingDescription =
  "Grouping dimensions for aggregating financial commitments on the report. Valid groupings: provider, service, resource_account_id, provider_account_id, commitment_type, commitment_id, cost_type, cost_category, cost_sub_category, instance_type, region, and tag:<tag_key>.";

const groupingSchemaBase = z.string().min(1);

const groupingSchema = groupingSchemaBase.refine(
  (value) =>
    financialCommitmentGroupings.includes(value as (typeof financialCommitmentGroupings)[number]) ||
    value.startsWith("tag:"),
  {
    error: groupingDescription,
    when(payload) {
      return groupingSchemaBase.safeParse(payload.value).success;
    },
  }
);

export default registerTool({
  name: "create-financial-commitment-report",
  title: "Create Financial Commitment Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: z
      .string()
      .min(1)
      .describe("The token of the Workspace to add the Financial Commitment Report to."),
    title: z.string().min(1).describe("Title for the new Financial Commitment Report"),
    filter: z.string().optional().describe("VQL filter to apply to the Financial Commitment Report"),
    start_date: dateValidator(
      "The start date of the Financial Commitment Report. ISO 8601 Formatted. Incompatible with 'date_interval' parameter."
    ).optional(),
    end_date: dateValidator(
      "The end date of the Financial Commitment Report. ISO 8601 Formatted. Incompatible with 'date_interval' parameter, required with 'start_date'."
    ).optional(),
    date_interval: z
      .enum(intervalOptions)
      .optional()
      .describe(
        "The date interval of the Financial Commitment Report. Incompatible with 'start_date' and 'end_date' parameters."
      ),
    date_bucket: z.enum(["hour", "day", "week", "month", "quarter"]).optional().describe("Date aggregation bucket"),
    on_demand_costs_scope: z.enum(["discountable", "all"]).optional().describe("Scope for on-demand costs"),
    groupings: z.array(groupingSchema).optional().describe(groupingDescription),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      "/v2/financial_commitment_reports",
      args as CreateFinancialCommitmentReportRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
