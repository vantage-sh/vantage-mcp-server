import { expect } from "vitest";
import { pathEncode } from "../../vantage-ts";
import tool from "./get-recommendation-resources";
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
	recommendation_token: "rec_123",
	page: 1,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "blank string recommendation_token",
		data: {
			recommendation_token: "",
			page: 1,
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid arguments",
		data: validArguments,
	},
];

const successData = {
	resources: [
		{
			token: "res_123",
			resource_type: "ec2_instance",
			resource_id: "i-1234567890abcdef0",
			configuration: { instance_type: "m5.large" },
		},
		{
			token: "res_456",
			resource_type: "ebs_volume",
			resource_id: "vol-1234567890abcdef0",
			configuration: { volume_type: "gp2", size: 100 },
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources`,
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
				resources: successData.resources,
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
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources`,
				params: {
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Recommendation not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Recommendation not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
