import { pathEncode, type UpdateResourceReportRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { resourceReportColumns } from "./schemas";

const description = `
Updates an existing Resource Report. Use to change the title, VQL filter, table columns, or folder.

Do not use create-resource-report (creates a new report) or get-resource-report (reads without changing). Use list-resource-reports or get-resource-report to find the resource_report_token.
`.trim();

export default registerTool({
  name: "update-resource-report",
  title: "Update Resource Report",
  description,
  annotations: {
    destructive: true,
    openWorld: false,
    readOnly: false,
  },
  args: {
    resource_report_token: z.string().min(1).describe("The token of the Resource Report to update."),
    title: z.string().min(1).optional().describe("Updated title for the Resource Report."),
    filter: z
      .string()
      .optional()
      .describe(
        "Updated VQL filter using resources and tags namespaces (e.g. resources.provider = 'aws' AND resources.type = 'aws_instance')."
      ),
    columns: resourceReportColumns,
    folder_token: z.string().optional().describe("Updated Folder token to move the Resource Report into."),
  },
  async execute(args, ctx) {
    const { resource_report_token, ...body } = args;
    const response = await ctx.callVantageApi(
      `/v2/resource_reports/${pathEncode(resource_report_token)}`,
      body as UpdateResourceReportRequest,
      "PUT"
    );
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
