import { pathEncode } from "@vantage-sh/vantage-client";
import { vantageToken } from "../../utils/zod";
import { deletedTokenOutputSchema } from "../../utils/zod/output";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Delete an Annotation by its token. This action is irreversible. Use list-annotations to find the annotation_token.
`.trim();

export default registerTool({
  name: "delete-annotation",
  title: "Delete Annotation",
  description,
  outputSchema: deletedTokenOutputSchema,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    annotation_token: vantageToken("annotation"),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi(`/v2/annotations/${pathEncode(args.annotation_token)}`, {}, "DELETE");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return { token: args.annotation_token };
  },
});
