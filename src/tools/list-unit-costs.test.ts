import type { GetUnitCostsResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-unit-costs";
import {
	dateValidatorPoisoner,
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	poisonOneValue,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const validArguments: InferValidators<Validators> = {
	cost_report_token: "crt_123",
	page: 1,
	start_date: "2023-01-01",
	end_date: "2023-01-31",
	date_bin: "month",
	order: "desc",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			cost_report_token: "crt_123",
			page: 1,
			start_date: undefined,
			end_date: undefined,
			date_bin: undefined,
			order: "desc",
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "order asc",
		data: {
			...validArguments,
			order: "asc",
		},
	},
	{
		name: "date_bin day",
		data: {
			...validArguments,
			date_bin: "day",
		},
	},
	{
		name: "date_bin week",
		data: {
			...validArguments,
			date_bin: "week",
		},
	},
	poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

function makeUnitCost(token: string) {
	return {
		business_metric_token: token,
		business_metric_title: `Unit ${token}`,
		unit_cost_amount: "100.5",
		business_metric_amount: "100.5",
		scale: 1,
		date: "2023-01-01",
	};
}

const successData: GetUnitCostsResponse = {
	unit_costs: [makeUnitCost("unit_123"), makeUnitCost("unit_456")],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call with all arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/unit_costs",
				method: "GET",
				params: {
					...validArguments,
					limit: 64,
				},
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
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				unit_costs: successData.unit_costs,
				pagination: {
					hasNextPage: true,
					nextPage: 2,
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/unit_costs",
				params: {
					cost_report_token: "crt_123",
					page: 1,
					start_date: undefined,
					end_date: undefined,
					date_bin: undefined,
					order: "desc",
					limit: 64,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Access denied" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				cost_report_token: "crt_123",
				page: 1,
				start_date: undefined,
				end_date: undefined,
				date_bin: undefined,
				order: "desc",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
