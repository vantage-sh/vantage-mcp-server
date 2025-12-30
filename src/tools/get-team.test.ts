import { expect } from "vitest";
import { pathEncode } from "../../vantage-ts";
import tool from "./get-team";
import { requestsInOrder, testTool } from "./utils/testing";

export const success = {
	token: "team_123",
	name: "Success Team",
	description: "So successful!",
	workspace_tokens: ["wrkspc_232345678", "wrkspc_987654321", "wrkspc_123456789"],
	user_emails: ["hello@test.com"],
	user_tokens: ["usr_wfergthyjukiop", "usr_987654321asdfghj"],
};

testTool(
	tool,
	[
		{
			name: "takes token",
			data: {
				token: "team_123",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/teams/${pathEncode("team_123")}`,
					params: {},
					method: "GET",
					result: {
						ok: true,
						data: success,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({ token: "team_123" });
				expect(res).toEqual(success);
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/teams/${pathEncode("team_456")}`,
					params: {},
					method: "GET",
					result: {
						ok: false,
						errors: [{ message: "Invalid token" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({
					token: "team_456",
				});
				expect(err.exception).toEqual({
					errors: [{ message: "Invalid token" }],
				});
			},
		},
	]
);
