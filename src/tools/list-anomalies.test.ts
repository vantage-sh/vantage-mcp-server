import { expect } from "vitest";
import tool from "./list-anomalies";
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
	page: 1,
	cost_report_token: "crt_123",
	service: "AmazonEC2",
	provider: "aws",
	cost_category: "compute",
	start_date: "2023-01-01",
	end_date: "2023-01-31",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			page: 1,
			cost_report_token: undefined,
			service: undefined,
			provider: undefined,
			cost_category: undefined,
			start_date: undefined,
			end_date: undefined,
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	poisonOneValue(validArguments, "start_date", dateValidatorPoisoner),
	poisonOneValue(validArguments, "end_date", dateValidatorPoisoner),
];

const successData = {
	anomaly_alerts: [
		{ id: "anomaly_123", description: "Unusual spike in EC2 costs" },
		{ id: "anomaly_456", description: "Unexpected S3 charges" },
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call with all arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/anomaly_alerts",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
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
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				anomaly_alerts: successData.anomaly_alerts,
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
				endpoint: "/v2/anomaly_alerts",
				params: {
					page: 1,
					cost_report_token: undefined,
					service: undefined,
					provider: undefined,
					cost_category: undefined,
					start_date: undefined,
					end_date: undefined,
					limit: DEFAULT_LIMIT,
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
				page: 1,
				cost_report_token: undefined,
				service: undefined,
				provider: undefined,
				cost_category: undefined,
				start_date: undefined,
				end_date: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
