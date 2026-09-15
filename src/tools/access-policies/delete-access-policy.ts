import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete an Access Policy. Teams it was assigned to lose the cost visibility limits it applied.
Requires account owner permissions; other callers receive 403 from the API.
`.trim();

export default registerTool({
  name: "delete-access-policy",
  title: "Delete Access Policy",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    access_policy_token: vantageToken("access_policy"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(
      `/v2/access_policies/${pathEncode(args.access_policy_token)}`,
      {},
      "DELETE"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.access_policy_token };
  },
});
