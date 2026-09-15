import { pathEncode, type UpdateAccessPolicyRequest } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
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
Update an Access Policy's title, description, cost filter, or Team assignments.
Requires account owner permissions; other callers receive 403 from the API.
`.trim();

export default registerTool({
  name: "update-access-policy",
  title: "Update Access Policy",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    access_policy_token: vantageToken("access_policy"),
    title: accessPolicyTitle.optional().describe("Updated Access Policy title."),
    policy_filter: accessPolicyFilter
      .optional()
      .describe(
        "Updated VQL controlling which costs this Access Policy allows, e.g. (vantage.provider = 'aws'). Uses the vantage.* namespace, not the costs.* namespace used by Cost Report filters. Replaces the existing filter."
      ),
    description: accessPolicyDescription
      .optional()
      .describe("Updated Access Policy description. Send null to clear the description."),
    team_tokens: accessPolicyTeamTokens
      .optional()
      .describe("Updated Teams assigned to this Access Policy. Replaces the existing assignments."),
  },
  async execute(args, ctx) {
    const { access_policy_token, policy_filter, ...rest } = args;
    const body = {
      ...rest,
      ...(policy_filter === undefined ? {} : { policy: accessPolicyDocument(policy_filter) }),
    } as UpdateAccessPolicyRequest;

    const response = await ctx.callVantageApi(`/v2/access_policies/${pathEncode(access_policy_token)}`, body, "PUT");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
