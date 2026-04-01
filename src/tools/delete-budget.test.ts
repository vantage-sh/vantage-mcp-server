import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./delete-budget";
import { requestsInOrder, testTool } from "./utils/testing";

testTool(
	tool,
	[
		{
			name: "takes budget_token",
			data: {
				budget_token: "bgt_fb27faa25ef5ea72",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/budgets/${pathEncode("bgt_fb27faa25ef5ea72")}`,
					params: {},
					method: "DELETE",
					result: {
						ok: true,
						data: undefined,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({
					budget_token: "bgt_fb27faa25ef5ea72",
				});
				expect(res).toEqual({ token: "bgt_fb27faa25ef5ea72" });
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/budgets/${pathEncode("bgt_nonexistent")}`,
					params: {},
					method: "DELETE",
					result: {
						ok: false,
						errors: [{ message: "Budget not found" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({
					budget_token: "bgt_nonexistent",
				});
				expect(err.exception).toEqual({
					errors: [{ message: "Budget not found" }],
				});
			},
		},
	]
);
