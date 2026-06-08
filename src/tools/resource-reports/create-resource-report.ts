import type { RequestBodyForPathAndMethod } from "@vantage-sh/vantage-client";
import z from "zod";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";
import { resourceReportColumns } from "./schemas";

const description = `
Create a saved Resource Report in Vantage. Resource Reports persist a VQL filter over cloud infrastructure resources so the view can be reopened, shared, added to dashboards, and queried later with list-provider-resources via resource_report_token. Returns the report token; link users to https://console.vantage.sh/go/<token>.

Resource Report VQL uses the resources and tags namespaces — not Cost Report costs VQL (create-cost-report). Use list-provider-resources for one-off resource queries without saving a report; use list-resource-reports to browse existing reports.
`.trim();

type CreateResourceReportRequest = RequestBodyForPathAndMethod<"/v2/resource_reports", "POST">;

export default registerTool({
  name: "create-resource-report",
  title: "Create Resource Report",
  description,
  annotations: {
    destructive: false,
    openWorld: false,
    readOnly: false,
  },
  args: {
    workspace_token: z
      .string()
      .min(1)
      .describe("Workspace token. Use get-myself to discover. Required when the API token spans multiple workspaces."),
    title: z.string().min(1).optional().describe("Title for the new Resource Report."),
    filter: z
      .string()
      .optional()
      .describe(
        "VQL filter using resources and tags namespaces (e.g. resources.provider = 'aws' AND resources.type = 'aws_instance')."
      ),
    columns: resourceReportColumns,
    folder_token: z
      .string()
      .optional()
      .describe("Folder token. When set, determines workspace (workspace_token is ignored)."),
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/resource_reports", args as CreateResourceReportRequest, "POST");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
