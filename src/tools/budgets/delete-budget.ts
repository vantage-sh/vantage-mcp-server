import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import { deletedTokenOutputSchema } from "../../utils/zod/output";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Deletes a Budget by its token. This action is irreversible.
`.trim();

export default registerTool({
  name: "delete-budget",
  title: "Delete Budget",
  description,
  outputSchema: deletedTokenOutputSchema,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    budget_token: vantageToken("budget"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/budgets/${pathEncode(args.budget_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.budget_token };
  },
});
