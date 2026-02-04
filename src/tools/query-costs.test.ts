import type { GetCostsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./query-costs";
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

// Note: groupings becomes a string after transformation
const validInputArguments = {
	page: 1,
	filter: "(costs.provider = 'aws')",
	start_date: "2023-01-01",
	end_date: "2023-01-31",
	workspace_token: "wt_123",
	date_bin: "month",
	settings_include_credits: false,
	settings_include_refunds: false,
	settings_include_discounts: true,
	settings_include_tax: true,
	settings_amortize: true,
	settings_unallocated: false,
	settings_aggregate_by: "cost",
	settings_show_previous_period: true,
	groupings: ["provider", "service", "region"] as string[],
} as const;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			page: 1,
			filter: "(costs.provider = 'aws')",
			start_date: undefined,
			end_date: undefined,
			workspace_token: "wt_123",
			date_bin: undefined,
			settings_include_credits: false,
			settings_include_refunds: false,
			settings_include_discounts: true,
			settings_include_tax: true,
			settings_amortize: true,
			settings_unallocated: false,
			settings_aggregate_by: "cost",
			settings_show_previous_period: true,
			groupings: ["provider", "service", "region"],
		},
	},
	{
		name: "blank workspace_token",
		data: {
			...validInputArguments,
			workspace_token: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "all valid arguments",
		data: validInputArguments,
	},
	{
		name: "aggregate by usage",
		data: {
			...validInputArguments,
			settings_aggregate_by: "usage",
		},
	},
	{
		name: "date_bin day",
		data: {
			...validInputArguments,
			date_bin: "day",
		},
	},
	{
		name: "date_bin week",
		data: {
			...validInputArguments,
			date_bin: "week",
		},
	},
	poisonOneValue(validInputArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validInputArguments, "end_date", dateValidatorPoisoner),
];

const successData: GetCostsResponse = {
	costs: [
		{
			accrued_at: "2023-01-01",
			currency: "USD",
			tag: "cost_123",
			amount: "100.5",
			service: "AmazonEC2",
			provider: "aws",
		},
		{
			accrued_at: "2023-01-01",
			currency: "USD",
			tag: "cost_456",
			amount: "75.25",
			service: "AmazonS3",
			provider: "aws",
		},
	],
	total_cost: {
		amount: "175.75",
		currency: "USD",
	},
	total_usage: {},
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call with minimal arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/costs",
				params: {
					page: 1,
					filter: "(costs.provider = 'aws')",
					start_date: undefined,
					end_date: undefined,
					workspace_token: "wt_123",
					date_bin: "month",
					groupings: ["provider", "service", "region"],
					"settings[include_credits]": false,
					"settings[include_refunds]": false,
					"settings[include_discounts]": true,
					"settings[include_tax]": true,
					"settings[amortize]": true,
					"settings[unallocated]": false,
					"settings[aggregate_by]": "cost",
					"settings[show_previous_period]": true,
					limit: 1000,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: "(costs.provider = 'aws')",
				start_date: undefined,
				end_date: undefined,
				workspace_token: "wt_123",
				date_bin: undefined,
				settings_include_credits: false,
				settings_include_refunds: false,
				settings_include_discounts: true,
				settings_include_tax: true,
				settings_amortize: true,
				settings_unallocated: false,
				settings_aggregate_by: "cost",
				settings_show_previous_period: true,
				groupings: ["provider", "service", "region"],
			});
			expect(res).toEqual({
				costs: successData.costs,
				total_cost: successData.total_cost,
				notes: "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.",
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "successful call with all arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/costs",
				params: {
					page: 1,
					filter: "(costs.provider = 'aws')",
					start_date: "2023-01-01",
					end_date: "2023-01-31",
					workspace_token: "wt_123",
					date_bin: "month",
					groupings: ["provider", "service", "region"],
					"settings[include_credits]": false,
					"settings[include_refunds]": false,
					"settings[include_discounts]": true,
					"settings[include_tax]": true,
					"settings[amortize]": true,
					"settings[unallocated]": false,
					"settings[aggregate_by]": "cost",
					"settings[show_previous_period]": true,
					limit: 1000,
				},
				method: "GET",
				result: {
					ok: true,
					data: {
						...successData,
						links: {
							next: "https://example.com?page=2",
						},
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validInputArguments);
			expect(res).toEqual({
				costs: successData.costs,
				total_cost: successData.total_cost,
				notes: "Costs records represent one month, the accrued_at field is the first day of the month. If your date range is less than one month, this record includes only data for that date range, not the full month.",
				pagination: {
					hasNextPage: true,
					nextPage: 2,
				},
			});
		},
	},
	{
		name: "successful call with day date_bin",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/costs",
				params: {
					page: 1,
					filter: "(costs.provider = 'aws')",
					start_date: "2023-01-01",
					end_date: "2023-01-31",
					workspace_token: "wt_123",
					date_bin: "day",
					groupings: ["provider", "service", "region"],
					"settings[include_credits]": false,
					"settings[include_refunds]": false,
					"settings[include_discounts]": true,
					"settings[include_tax]": true,
					"settings[amortize]": true,
					"settings[unallocated]": false,
					"settings[aggregate_by]": "cost",
					"settings[show_previous_period]": true,
					limit: 1000,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				...validInputArguments,
				date_bin: "day",
			});
			expect(res).toEqual({
				costs: successData.costs,
				total_cost: successData.total_cost,
				notes: "Costs records represent one day.",
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/costs",
				params: {
					page: 1,
					filter: "(costs.provider = 'aws')",
					start_date: undefined,
					end_date: undefined,
					workspace_token: "wt_123",
					date_bin: "month",
					groupings: ["provider", "service", "region"],
					"settings[include_credits]": false,
					"settings[include_refunds]": false,
					"settings[include_discounts]": true,
					"settings[include_tax]": true,
					"settings[amortize]": true,
					"settings[unallocated]": false,
					"settings[aggregate_by]": "cost",
					"settings[show_previous_period]": true,
					limit: 1000,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid VQL query" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				page: 1,
				filter: "(costs.provider = 'aws')",
				start_date: undefined,
				end_date: undefined,
				workspace_token: "wt_123",
				date_bin: undefined,
				settings_include_credits: false,
				settings_include_refunds: false,
				settings_include_discounts: true,
				settings_include_tax: true,
				settings_amortize: true,
				settings_unallocated: false,
				settings_aggregate_by: "cost",
				settings_show_previous_period: true,
				groupings: ["provider", "service", "region"],
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid VQL query" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
