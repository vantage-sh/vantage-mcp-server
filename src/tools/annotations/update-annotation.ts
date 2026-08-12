import { pathEncode, type UpdateAnnotationRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Update the title, date, message, or associated Cost Reports of an existing Annotation. Providing report_tokens replaces all existing Report associations. Use list-annotations to find the annotation_token.
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
    title: z.string().min(1).optional().describe("Updated Annotation title."),
    date: dateValidator("Updated Annotation date in ISO 8601 format (YYYY-MM-DD).").optional(),
    message: z.string().min(1).optional().describe("Updated message for the Annotation."),
    report_tokens: z
      .array(
        vantageToken("cost_report", {
          description: "Replacement Cost Report for the Annotation.",
        })
      )
      .min(1)
      .optional()
      .describe("Replacement Cost Reports for the Annotation."),
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
