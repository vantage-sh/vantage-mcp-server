import { pathEncode, type UpdateAnnotationRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Update the date or message of an existing Annotation. Use list-annotations to find the annotation_token.
`.trim();

export default registerTool({
  name: "update-annotation",
  title: "Update Annotation",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    annotation_token: vantageToken("annotation"),
    date: dateValidator("Updated Annotation date in ISO 8601 format (YYYY-MM-DD).").optional(),
    message: z.string().min(1).optional().describe("Updated message for the Annotation."),
  },
  async execute(args, ctx) {
    const { annotation_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/annotations/${pathEncode(annotation_token)}`,
      body as UpdateAnnotationRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
