import { expect } from "vitest";
import tool from "./list-cost-services";
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
	workspace_token: "wt_123",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "valid workspace_token",
		data: validArguments,
	},
];

const successData = {
	cost_services: [
		{ name: "AmazonEC2", provider: "aws" },
		{ name: "AmazonS3", provider: "aws" },
	],
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_services",
				params: {
					workspace_token: "wt_123",
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
			expect(res).toEqual(successData);
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_services",
				params: {
					workspace_token: "wt_123",
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid workspace token" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid workspace token" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
