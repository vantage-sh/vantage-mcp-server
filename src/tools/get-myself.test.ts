import { expect } from "vitest";
import tool from "./get-myself";
import { requestsInOrder, testTool } from "./utils/testing";

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
						data: {
							bearer_token: {
								description: "test",
							},
							workspaces: [{ token: "ws_123" }],
						},
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({});
				expect(res).toEqual({
					bearer_token: {
						description: "test",
					},
					workspaces: [{ token: "ws_123" }],
				});
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
