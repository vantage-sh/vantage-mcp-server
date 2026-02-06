import { type GetCostAlertResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-cost-alert";
import { requestsInOrder, testTool } from "./utils/testing";

export const success: GetCostAlertResponse = {
	token: "cstm_alrt_rl_123",
	title: "Daily AWS Alert",
	interval: "day",
	threshold: 100,
	unit_type: "currency",
	workspace_token: "wrkspc_123",
	report_tokens: ["rprt_123"],
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z",
	email_recipients: ["user@example.com"],
	slack_channels: ["#alerts"],
	teams_channels: ["General"],
	minimum_threshold: 50,
};

testTool(
	tool,
	[
		{
			name: "takes cost_alert_token",
			data: {
				cost_alert_token: "cstm_alrt_rl_123",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_123")}`,
					params: {},
					method: "GET",
					result: {
						ok: true,
						data: success,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({ cost_alert_token: "cstm_alrt_rl_123" });
				expect(res).toEqual(success);
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/cost_alerts/${pathEncode("cstm_alrt_rl_456")}`,
					params: {},
					method: "GET",
					result: {
						ok: false,
						errors: [{ message: "Cost alert not found" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({
					cost_alert_token: "cstm_alrt_rl_456",
				});
				expect(err.exception).toEqual({
					errors: [{ message: "Cost alert not found" }],
				});
			},
		},
	]
);
