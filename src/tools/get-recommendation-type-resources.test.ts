import { pathEncode } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./get-recommendation-type-resources";
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
	type: "aws:ec2:rightsizing",
	workspace_token: "wrkspc_123",
	page: 1,
	status: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "missing type",
		data: {
			workspace_token: "wrkspc_123",
			page: 1,
		} as any,
		expectedIssues: ["Invalid input: expected string, received undefined"],
	},
	{
		name: "missing workspace_token",
		data: {
			type: "aws:ec2:rightsizing",
			page: 1,
		} as any,
		expectedIssues: ["Invalid input: expected string, received undefined"],
	},
	{
		name: "valid arguments",
		data: validArguments,
	},
	{
		name: "valid arguments with status",
		data: {
			...validArguments,
			status: "active",
		},
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
			resource_type: "ec2_instance",
			resource_id: "i-0987654321fedcba0",
			configuration: { instance_type: "m5.xlarge" },
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/recommendations/by_type/${pathEncode("aws:ec2:rightsizing")}/resources`,
				params: {
					workspace_token: "wrkspc_123",
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
				endpoint: `/v2/recommendations/by_type/${pathEncode("aws:ec2:rightsizing")}/resources`,
				params: {
					workspace_token: "wrkspc_123",
					page: 1,
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Recommendation type not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Recommendation type not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
