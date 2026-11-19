import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { calculationDescription, calculationFilter, displayAs, operation, unitScale } from "./schemas";

const description = `Update a Custom Calculation (KPI) definition or its Cost Report attachments. Read-only calculations allow attachment changes only.`;

export default registerTool({
  name: "update-custom-calculation",
  title: "Update Custom Calculation",
  description,
  annotations: { readOnly: false, destructive: true, openWorld: false },
  args: {
    custom_calculation_token: vantageToken("custom_calculation"),
    title: nonempty().optional().describe("Updated title of the Custom Calculation."),
    description: calculationDescription,
    filter: calculationFilter.optional(),
    operation: operation.optional(),
    display_as: displayAs.optional(),
    unit_scale: unitScale.optional(),
    cost_report_tokens: z
      .array(vantageToken("cost_report"))
      .nullable()
      .optional()
      .describe(
        "Complete replacement set of Cost Reports. Omit or send null to leave attachments unchanged; [] clears them. Requires access to every attached report. New attachments do not enable a chart line."
      ),
  },
  async execute(args, ctx) {
    const { custom_calculation_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/custom_calculations/${pathEncode(custom_calculation_token)}`,
      body,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
