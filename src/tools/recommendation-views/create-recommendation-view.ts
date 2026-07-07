import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import dateValidator from "../utils/dateValidator";

const description = `
Create a new Recommendation View in Vantage.

Recommendation Views are saved filters for recommendations. They can be scoped by provider,
billing account, cloud account, region, recommendation type, tags, creation date, and minimum
potential savings.

Use get-myself to find available workspaces. Use list-recommendations to discover valid provider
IDs, recommendation types, accounts, regions, tags, and savings ranges before creating a view.

Filter examples:
- AWS recommendations in production: provider_ids ["aws"], tag_key "environment", tag_value "production"
- High-savings recommendations: min_savings 100
- Recommendations created in a date range: start_date "2024-01-01", end_date "2024-06-30"
`.trim();

type CreateRecommendationViewRequest = RequestBodyForPathAndMethod<"/v2/recommendation_views", "POST">;

export default registerTool({
  name: "create-recommendation-view",
  title: "Create Recommendation View",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: z.string().min(1).describe("Title for the new Recommendation View."),
    workspace_token: z.string().min(1).describe("The token of the Workspace to add the Recommendation View to."),
    provider_ids: z
      .array(z.string().min(1))
      .optional()
      .describe("Filter by one or more providers (e.g. aws, gcp, azure, kubernetes, datadog)."),
    billing_account_ids: z.array(z.string().min(1)).optional().describe("Filter by billing account identifiers."),
    account_ids: z.array(z.string().min(1)).optional().describe("Filter by cloud account identifiers."),
    regions: z
      .array(z.string().min(1))
      .optional()
      .describe("Filter by region slugs (e.g. us-east-1, eastus, asia-east1)."),
    types: z.array(z.string().min(1)).optional().describe("Filter by one or more recommendation type slugs."),
    tag_key: z.string().min(1).optional().describe("Filter by tag key. Must be used with tag_value."),
    tag_value: z.string().min(1).optional().describe("Filter by tag value. Requires tag_key."),
    start_date: dateValidator("Filter recommendations created on/after this YYYY-MM-DD date.").optional(),
    end_date: dateValidator("Filter recommendations created on/before this YYYY-MM-DD date.").optional(),
    min_savings: z
      .number()
      .min(0)
      .optional()
      .describe("Filter recommendations with at least this amount of potential savings."),
  },
  async execute(args, ctx) {
    if (!!args.tag_key !== !!args.tag_value) {
      throw new MCPUserError({
        errors: [{ message: "tag_key and tag_value must both be provided together" }],
      });
    }
    if (!!args.start_date !== !!args.end_date) {
      throw new MCPUserError({
        errors: [{ message: "start_date and end_date must both be provided together" }],
      });
    }

    const response = await ctx.callVantageApi(
      "/v2/recommendation_views",
      args as CreateRecommendationViewRequest,
      "POST"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
