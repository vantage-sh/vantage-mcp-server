import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import dateValidator from "./utils/dateValidator";
import paginationData from "./utils/paginationData";

const description = `
Given a token of a Cost Report, look for anomalies in the report. You may optionally pass a Provider, like AWS to filter on. If you do pass a Provider, you can futher filter on a Service, like EC2 or S3.
The report token can be used to link the user to the report in the Vantage Web UI. Build the link like this: https://console.vantage.sh/go/<CostReportToken>
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	cost_report_token: z.string().optional().describe("Cost report to filter anomalies by"),
	service: z.string().optional().describe("Service to filter anomalies to"),
	provider: z.string().optional().describe("Provider to filter anomalies to"),
	cost_category: z.string().optional().describe("Cost category to filter anomalies to"),
	start_date: dateValidator("Start date to filter anomalies to").optional(),
	end_date: dateValidator("End date to filter anomalies to").optional(),
};

export default registerTool({
	name: "list-anomalies",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = { ...args, limit: DEFAULT_LIMIT };
		const response = await ctx.callVantageApi("/v2/anomaly_alerts", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			anomaly_alerts: response.data.anomaly_alerts,
			pagination: paginationData(response.data),
		};
	},
});
