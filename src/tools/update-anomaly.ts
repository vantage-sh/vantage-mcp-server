import { pathEncode } from "@vantage-sh/vantage-client";
import z from "zod/v4";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";

const description = `
Updates an existing anomaly alert by its token. Use this to change the status of an anomaly alert (e.g. to archive or ignore it) and optionally provide feedback.
`.trim();

export default registerTool({
	name: "update-anomaly",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: false,
	},
	args: {
		anomaly_alert_token: z.string().describe("The token of the anomaly alert to update."),
		status: z
			.enum(["active", "archived", "ignored"])
			.describe("The new status of the anomaly alert."),
		feedback: z
			.string()
			.optional()
			.describe("Optional comments explaining why the alert is being ignored or archived."),
	},
	async execute(args, ctx) {
		const { anomaly_alert_token, ...body } = args;
		const res = await ctx.callVantageApi(
			`/v2/anomaly_alerts/${pathEncode(anomaly_alert_token)}`,
			body,
			"PUT"
		);
		if (!res.ok) {
			throw new MCPUserError({ errors: res.errors });
		}
		return res.data;
	},
});
