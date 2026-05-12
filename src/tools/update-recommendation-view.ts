import { pathEncode, type UpdateRecommendationViewRequest } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";

const description = `
Updates an existing Recommendation View. Use this to change the view title or the filters applied to saved recommendation views.

Filters can be scoped by provider, billing account, cloud account, region, tag key/value, and recommendation creation date range.

Dates must be YYYY-MM-DD formatted. Tag filters should use tag_key and tag_value together.
`.trim();

export default registerTool({
  name: "update-recommendation-view",
  title: "Update Recommendation View",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    recommendation_view_token: z.string().min(1).describe("Token of the Recommendation View to update."),
    title: z.string().min(1).optional().describe("Updated title for the Recommendation View."),
    provider_ids: z
      .array(z.string())
      .optional()
      .describe("Updated provider filters, such as aws, gcp, azure, kubernetes, or datadog."),
    billing_account_ids: z.array(z.string()).optional().describe("Updated billing account identifier filters."),
    account_ids: z.array(z.string()).optional().describe("Updated cloud account identifier filters."),
    regions: z
      .array(z.string())
      .optional()
      .describe("Updated region slug filters, such as us-east-1, eastus, or asia-east1."),
    tag_key: z.string().optional().describe("Updated tag key filter. Use with tag_value."),
    tag_value: z.string().optional().describe("Updated tag value filter. Requires tag_key."),
    start_date: dateValidator(
      "Updated start date for recommendation creation filtering. YYYY-MM-DD formatted."
    ).optional(),
    end_date: dateValidator("Updated end date for recommendation creation filtering. YYYY-MM-DD formatted.").optional(),
  },
  async execute(args, ctx) {
    const { recommendation_view_token, ...requestBody } = args;
    const body: UpdateRecommendationViewRequest = requestBody;
    const response = await ctx.callVantageApi(
      `/v2/recommendation_views/${pathEncode(recommendation_view_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
