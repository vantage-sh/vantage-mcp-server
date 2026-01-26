import { expect } from "vitest";
import tool from "./create-cost-report";
import {
	dateValidatorPoisoner,
	type ExecutionTestTableItem,
	type ExtractValidators,
	poisonOneValue,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const undefineds = {
	workspace_token: undefined,
	business_metric_tokens_with_metadata: undefined,
	chart_settings: undefined,
	chart_type: undefined,
	date_interval: undefined,
	end_date: undefined,
	start_date: undefined,
	filter: undefined,
	folder_token: undefined,
	groupings: undefined,
	previous_period_end_date: undefined,
	previous_period_start_date: undefined,
	saved_filter_tokens: undefined,
	settings: undefined,
};

const validInputArguments = {
	title: "Test Cost Report",
	workspace_token: "wt_123",
	groupings: ["provider", "service", "region"] as ["provider", "service", "region"],
	filter: "(costs.provider = 'aws')",
	saved_filter_tokens: ["sf_123", "sf_456"] as ["sf_123", "sf_456"],
	business_metric_tokens_with_metadata: [
		{
			business_metric_token: "bm_123",
			unit_scale: "per_unit" as const,
			label_filter: ["prod", "staging"] as ["prod", "staging"],
		},
	],
	folder_token: "folder_123",
	settings: {
		include_credits: true,
		include_refunds: false,
		include_discounts: true,
		include_tax: true,
		amortize: true,
		unallocated: false,
		aggregate_by: "cost" as const,
		show_previous_period: true,
	},
	previous_period_start_date: "2023-01-01",
	previous_period_end_date: "2023-01-31",
	start_date: "2023-02-01",
	end_date: "2023-02-28",
	date_interval: "custom" as const,
	chart_type: "line" as const,
	chart_settings: {
		x_axis_dimension: ["date"],
		y_axis_dimension: "cost",
	},
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			...undefineds,
			title: "Minimal Report",
		},
	},
	{
		name: "all valid arguments",
		data: validInputArguments,
	},
	{
		name: "empty title",
		data: {
			...validInputArguments,
			title: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid date_interval options",
		data: {
			...undefineds,
			title: "Test Report",
			date_interval: "this_month",
		},
	},
	{
		name: "all chart types",
		data: {
			...undefineds,
			title: "Test Report",
			chart_type: "area",
		},
	},
	{
		name: "bar chart type",
		data: {
			...undefineds,
			title: "Test Report",
			chart_type: "bar",
		},
	},
	{
		name: "multi_bar chart type",
		data: {
			...undefineds,
			title: "Test Report",
			chart_type: "multi_bar",
		},
	},
	{
		name: "pie chart type",
		data: {
			...undefineds,
			title: "Test Report",
			chart_type: "pie",
		},
	},
	{
		name: "invalid chart type",
		data: {
			...undefineds,
			title: "Test Report",
			chart_type: "invalid" as any,
		},
		expectedIssues: ['Invalid option: expected one of "area"|"line"|"bar"|"multi_bar"|"pie"'],
	},
	{
		name: "aggregate by usage",
		data: {
			...undefineds,
			title: "Test Report",
			settings: {
				aggregate_by: "usage",
			},
		},
	},
	{
		name: "invalid aggregate_by",
		data: {
			...undefineds,
			title: "Test Report",
			settings: {
				aggregate_by: "invalid" as any,
			},
		},
		expectedIssues: ['Invalid option: expected one of "cost"|"usage"'],
	},
	{
		name: "business metric with per_thousand scale",
		data: {
			...undefineds,
			title: "Test Report",
			business_metric_tokens_with_metadata: [
				{
					business_metric_token: "bm_123",
					unit_scale: "per_thousand",
				},
			],
		},
	},
	{
		name: "business metric with per_million scale",
		data: {
			...undefineds,
			title: "Test Report",
			business_metric_tokens_with_metadata: [
				{
					business_metric_token: "bm_123",
					unit_scale: "per_million",
				},
			],
		},
	},
	{
		name: "business metric with per_billion scale",
		data: {
			...undefineds,
			title: "Test Report",
			business_metric_tokens_with_metadata: [
				{
					business_metric_token: "bm_123",
					unit_scale: "per_billion",
				},
			],
		},
	},
	{
		name: "business metric with empty token",
		data: {
			...undefineds,
			title: "Test Report",
			business_metric_tokens_with_metadata: [
				{
					business_metric_token: "",
					unit_scale: "per_unit",
				},
			],
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "invalid unit_scale",
		data: {
			...undefineds,
			title: "Test Report",
			business_metric_tokens_with_metadata: [
				{
					business_metric_token: "bm_123",
					unit_scale: "invalid" as any,
				},
			],
		},
		expectedIssues: [
			'Invalid option: expected one of "per_unit"|"per_hundred"|"per_thousand"|"per_million"|"per_billion"',
		],
	},
	{
		name: "date_interval last_7_days",
		data: {
			...undefineds,
			title: "Test Report",
			date_interval: "last_7_days",
		},
	},
	{
		name: "date_interval last_30_days",
		data: {
			...undefineds,
			title: "Test Report",
			date_interval: "last_30_days",
		},
	},
	{
		name: "date_interval year_to_date",
		data: {
			...undefineds,
			title: "Test Report",
			date_interval: "year_to_date",
		},
	},
	{
		name: "invalid date_interval",
		data: {
			...undefineds,
			title: "Test Report",
			date_interval: "invalid" as any,
		},
		expectedIssues: [
			'Invalid option: expected one of "this_month"|"last_7_days"|"last_30_days"|"last_month"|"last_3_months"|"last_6_months"|"custom"|"last_12_months"|"last_24_months"|"last_36_months"|"next_month"|"next_3_months"|"next_6_months"|"next_12_months"|"year_to_date"|"last_3_days"|"last_14_days"',
		],
	},
	{
		name: "chart settings with usage y-axis",
		data: {
			...undefineds,
			title: "Test Report",
			chart_settings: {
				y_axis_dimension: "usage",
			},
		},
	},
	poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
	poisonOneValue(validInputArguments, "previous_period_start_date", dateValidatorPoisoner),
	poisonOneValue(validInputArguments, "previous_period_end_date", dateValidatorPoisoner),
];

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_reports",
				params: {
					title: "Minimal Report",
				},
				method: "POST",
				result: {
					ok: true,
					data: {
						cost_report: {
							token: "crt_456",
							title: "Minimal Report",
						},
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				...undefineds,
				title: "Minimal Report",
			});
			expect(res).toEqual({
				cost_report: {
					token: "crt_456",
					title: "Minimal Report",
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_reports",
				params: {
					title: "Invalid Filter Report",
					filter: "invalid vql",
				},
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Invalid VQL filter syntax" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				...undefineds,
				title: "Invalid Filter Report",
				filter: "invalid vql",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid VQL filter syntax" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
