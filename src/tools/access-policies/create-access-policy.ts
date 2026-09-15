import type { CreateAccessPolicyRequest } from "@vantage-sh/vantage-client";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import {
  accessPolicyDescription,
  accessPolicyDocument,
  accessPolicyFilter,
  accessPolicyTeamTokens,
  accessPolicyTitle,
} from "./schemas";

const description = `
Create an Access Policy, which limits the costs visible to the Teams it is assigned to.
Requires account owner permissions; other callers receive 403 from the API.
`.trim();

export default registerTool({
  name: "create-access-policy",
  title: "Create Access Policy",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    title: accessPolicyTitle.describe("Access Policy title."),
    policy_filter: accessPolicyFilter.describe(
      "VQL controlling which costs this Access Policy allows, e.g. (vantage.provider = 'aws'). Uses the vantage.* namespace, not the costs.* namespace used by Cost Report filters."
    ),
    description: accessPolicyDescription.optional().describe("Access Policy description."),
    team_tokens: accessPolicyTeamTokens.optional().describe("Teams to assign this Access Policy to."),
  },
  async execute(args, ctx) {
    const { policy_filter, ...rest } = args;
    const body = {
      ...rest,
      policy: accessPolicyDocument(policy_filter),
    } as CreateAccessPolicyRequest;

    const response = await ctx.callVantageApi("/v2/access_policies", body, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
