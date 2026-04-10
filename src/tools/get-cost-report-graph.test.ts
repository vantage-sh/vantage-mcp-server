import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-cost-report-graph";
import {
	dateValidatorPoisoner,
	type ExecutionTestTableItem,
	type ExtractOutputSchema,
	type ExtractValidators,
	type InferValidators,
	poisonOneValue,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
	cost_report_token: "rprt_123",
	start_date: "2023-01-01",
	end_date: "2023-01-31",
	date_bin: "day",
	chart_type: "line",
	groupings: "provider,service",
	filter: "costs.provider = 'aws'",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "only required arguments",
		data: { cost_report_token: "rprt_123" },
	},
	poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const outputSchemaTests: SchemaTestTableItem<OutputSchema>[] = [
	{
		name: "valid graph response",
		data: {
			url: "https://s3.amazonaws.com/bucket/cost-report-graph-uuid.png?signature=abc",
			report_token: "rprt_123",
			title: "AWS Costs",
		},
	},
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/cost_reports/${pathEncode("rprt_123")}/graph`,
				params: {
					start_date: "2023-01-01",
					end_date: "2023-01-31",
					date_bin: "day",
					chart_type: "line",
					groupings: "provider,service",
					filter: "costs.provider = 'aws'",
				},
				method: "GET",
				result: {
					ok: true,
					data: {
						url: "https://s3.amazonaws.com/bucket/cost-report-graph-uuid.png?signature=abc",
						report_token: "rprt_123",
						title: "AWS Costs",
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				url: "https://s3.amazonaws.com/bucket/cost-report-graph-uuid.png?signature=abc",
				report_token: "rprt_123",
				title: "AWS Costs",
			});
		},
	},

	{
		name: "successful call with minimal arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/cost_reports/${pathEncode("rprt_123")}/graph`,
				params: {},
				method: "GET",
				result: {
					ok: true,
					data: {
						url: "https://s3.amazonaws.com/bucket/graph.png?sig=xyz",
						report_token: "rprt_123",
						title: "My Report",
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({ cost_report_token: "rprt_123" });
			expect(res).toEqual({
				url: "https://s3.amazonaws.com/bucket/graph.png?sig=xyz",
				report_token: "rprt_123",
				title: "My Report",
			});
		},
	},

	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/cost_reports/${pathEncode("rprt_123")}/graph`,
				params: {
					start_date: "2023-01-01",
					end_date: "2023-01-31",
					date_bin: "day",
					chart_type: "line",
					groupings: "provider,service",
					filter: "costs.provider = 'aws'",
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "CostReport rprt_123 not found." }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "CostReport rprt_123 not found." }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, outputSchemaTests, executionTests);
