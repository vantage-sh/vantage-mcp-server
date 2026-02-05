import { expect } from "vitest";
import tool from "./get-myself";
import { requestsInOrder, testTool } from "./utils/testing";

const ws = {
	token: "ws_123",
	name: "Workspace 1",
	created_at: "2023-01-01T00:00:00Z",
	enable_currency_conversion: true,
	currency: "USD",
	exchange_rate_date: "2023-01-01T00:00:00Z",
};

const successData = {
	default_workspace_token: "ws_123",
	workspaces: [ws],
	bearer_token: {
		created_at: "2023-01-01T00:00:00Z",
		scope: ["read"],
		description: "test",
	},
};

testTool(
	tool,
	[
		{
			name: "is blank",
			data: {},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: "/v2/me",
					params: {},
					method: "GET",
					result: {
						ok: true,
						data: successData,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({});
				expect(res).toEqual(successData);
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: "/v2/me",
					params: {},
					method: "GET",
					result: {
						ok: false,
						errors: [{ message: "Invalid token" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({});
				expect(err.exception).toEqual({
					errors: [{ message: "Invalid token" }],
				});
			},
		},
	]
);
