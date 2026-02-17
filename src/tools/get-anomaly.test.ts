import { type GetAnomalyAlertResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-anomaly";
import { requestsInOrder, testTool } from "./utils/testing";

const success: GetAnomalyAlertResponse = {
	token: "anmly_alrt_123",
	created_at: "2023-01-01T00:00:00Z",
	category: "compute",
	service: "AmazonEC2",
	provider: "aws",
	amount: "100.5",
	previous_amount: "25.0",
	seven_day_average: "10.0",
	status: "active",
	resources: ["resource_123", "resource_456"],
	cost_report_token: "crt_123",
};

testTool(
	tool,
	[
		{
			name: "takes anomaly_alert_token",
			data: {
				anomaly_alert_token: "anmly_alrt_123",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_123")}`,
					params: {},
					method: "GET",
					result: {
						ok: true,
						data: success,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({ anomaly_alert_token: "anmly_alrt_123" });
				expect(res).toEqual(success);
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/anomaly_alerts/${pathEncode("anmly_alrt_456")}`,
					params: {},
					method: "GET",
					result: {
						ok: false,
						errors: [{ message: "Anomaly alert not found" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({
					anomaly_alert_token: "anmly_alrt_456",
				});
				expect(err.exception).toEqual({
					errors: [{ message: "Anomaly alert not found" }],
				});
			},
		},
	]
);
