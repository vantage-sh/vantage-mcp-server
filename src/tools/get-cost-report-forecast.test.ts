import { expect } from "vitest";
import tool from "./get-cost-report-forecast";
import { DEFAULT_LIMIT } from "./structure/constants";
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
	provider: "aws",
	service: "AmazonEC2",
	start_date: "2023-01-01",
	end_date: "2023-01-31",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "all valid arguments",
		data: validArguments,
	},
	poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const executionTests: ExecutionTestTableItem<Validators>[] = [
	// Success cases

	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_reports/crt_123/forecasted_costs",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: true,
					data: {
						forecasted_costs: "hello",
						links: {},
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				forecasted_costs: "hello",
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},

	// API failure

	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_reports/crt_123/forecasted_costs",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid token" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid token" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
