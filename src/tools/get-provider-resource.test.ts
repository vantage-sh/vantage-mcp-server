import { expect } from "vitest";
import tool from "./get-provider-resource";
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
	resource_token: "prvdr_rsrc_123",
	include_cost: false,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "valid Vantage token",
		data: {
			resource_token: "prvdr_rsrc_123",
			include_cost: false,
		},
	},
	{
		name: "valid UUID",
		data: {
			resource_token: "i-1234567890abcdef0",
			include_cost: true,
		},
	},
	{
		name: "valid ARN",
		data: {
			resource_token: "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0",
			include_cost: false,
		},
	},
	{
		name: "default include_cost",
		data: {
			resource_token: "prvdr_rsrc_456",
			include_cost: false,
		},
	},
	{
		name: "empty resource_token",
		data: {
			resource_token: "",
			include_cost: false,
		},
		expectedIssues: ["String must contain at least 1 character(s)"],
	},
];

const successData = {
	token: "prvdr_rsrc_123",
	resource_id: "i-1234567890abcdef0",
	resource_type: "EC2Instance",
	provider: "aws",
	provider_account_id: "123456789012",
	billing_account_id: "123456789012",
	region: "us-east-1",
	created_at: "2023-01-15T10:30:00Z",
	metadata: {
		instance_type: "t3.medium",
		state: "running",
		vpc_id: "vpc-12345678",
		subnet_id: "subnet-87654321",
		security_groups: ["sg-12345678"],
	},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	// Success cases

	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/resources/prvdr_rsrc_123",
				params: {
					include_cost: false,
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

	// Failure cases

	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/resources/invalid_token",
				params: {
					include_cost: false,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid resource token format" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				resource_token: "invalid_token",
				include_cost: false,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid resource token format" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
