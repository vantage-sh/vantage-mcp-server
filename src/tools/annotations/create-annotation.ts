import z from "zod";
import dateValidator from "../../utils/dateValidator";
import { vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
Create an Annotation on one or more Cost Reports for a specific date. Use this tool when a user asks to add a note, explanation, or event marker to Cost Reports.
`.trim();

export default registerTool({
  name: "create-annotation",
  title: "Create Annotation",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    report_tokens: z
      .array(
        vantageToken("cost_report", {
          description: "Cost Report to annotate.",
        })
      )
      .min(1)
      .describe("Cost Reports to annotate."),
    title: z.string().min(1).optional().describe("Annotation title. Generated automatically when omitted."),
    date: dateValidator("Date of the Annotation in ISO 8601 format (YYYY-MM-DD)."),
    message: z.string().min(1).describe("Message to display for the Annotation."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/annotations", args, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
