import { type DeleteCostReportResponse, pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./delete-cost-report";
import { requestsInOrder, testTool } from "./utils/testing";

const success: DeleteCostReportResponse = {
	token: "rprt_fb27faa25ef5ea72",
	title: "Untitled",
	folder_token: undefined,
	saved_filter_tokens: [],
	business_metric_tokens_with_metadata: [],
	filter: null,
	groupings: "service,provider",
	settings: {
		include_credits: false,
		include_refunds: false,
		include_discounts: true,
		include_tax: true,
		amortize: true,
		unallocated: false,
		aggregate_by: "cost",
		show_previous_period: true,
	},
	created_at: "2024-07-03T00:00:00Z",
	workspace_token: "wrkspc_e5c550d14cfa3101",
	previous_period_start_date: undefined,
	previous_period_end_date: undefined,
	start_date: "2024-07-01",
	end_date: "2024-07-31",
	date_interval: "this_month",
	chart_type: "line",
	date_bin: "cumulative",
	chart_settings: {
		y_axis_dimension: "cost",
		x_axis_dimension: ["date"],
	},
};

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
						data: success,
					},
				},
			]),
			handler: async ({ callExpectingSuccess }) => {
				const res = await callExpectingSuccess({
					cost_report_token: "rprt_fb27faa25ef5ea72",
				});
				expect(res).toEqual(success);
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
