import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./delete-cost-report";
import { requestsInOrder, testTool } from "./utils/testing";

testTool(
	tool,
	[
		{
			name: "takes cost_report_token",
			data: {
				cost_report_token: "rprt_fb27faa25ef5ea72",
			},
		},
	],
	[
		{
			name: "successful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/cost_reports/${pathEncode("rprt_fb27faa25ef5ea72")}`,
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
					cost_report_token: "rprt_fb27faa25ef5ea72",
				});
				expect(res).toEqual({ token: "rprt_fb27faa25ef5ea72" });
			},
		},
		{
			name: "unsuccessful call",
			apiCallHandler: requestsInOrder([
				{
					endpoint: `/v2/cost_reports/${pathEncode("rprt_nonexistent")}`,
					params: {},
					method: "DELETE",
					result: {
						ok: false,
						errors: [{ message: "Cost report not found" }],
					},
				},
			]),
			handler: async ({ callExpectingMCPUserError }) => {
				const err = await callExpectingMCPUserError({
					cost_report_token: "rprt_nonexistent",
				});
				expect(err.exception).toEqual({
					errors: [{ message: "Cost report not found" }],
				});
			},
		},
	]
);
