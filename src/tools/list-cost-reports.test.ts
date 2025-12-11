import { expect } from "vitest";
import tool from "./list-cost-reports";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const validArguments: InferValidators<Validators> = {
	page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page",
		data: {
			page: undefined,
		},
	},
	{
		name: "valid page number",
		data: validArguments,
	},
];

const successData = {
	cost_reports: [
		{ token: "crt_123", title: "Monthly AWS Costs", filter: "provider = aws" },
		{
			token: "crt_456",
			title: "Azure EC2 Costs",
			filter: "provider = azure AND service = EC2",
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_reports",
				params: {
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				cost_reports: successData.cost_reports,
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
				endpoint: "/v2/cost_reports",
				params: {
					page: 1,
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
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
