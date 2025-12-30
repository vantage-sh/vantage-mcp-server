import { expect } from "vitest";
import { pathEncode } from "../../vantage-ts";
import tool from "./get-recommendation-resource-details";
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
	resource_token: "res_456",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "blank string recommendation_token",
		data: {
			recommendation_token: "",
			resource_token: "res_456",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "blank string resource_token",
		data: {
			recommendation_token: "rec_123",
			resource_token: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid arguments",
		data: validArguments,
	},
];

const successData = {
	resource_token: "res_456",
	resource_type: "ec2_instance",
	resource_id: "i-1234567890abcdef0",
	current_configuration: {
		instance_type: "m5.xlarge",
		vcpus: 4,
		memory_gb: 16,
	},
	recommended_configuration: {
		instance_type: "m5.large",
		vcpus: 2,
		memory_gb: 8,
	},
	utilization_metrics: {
		cpu_avg: 15.2,
		memory_avg: 35.8,
	},
	estimated_savings: {
		monthly_amount: 75.5,
		currency: "USD",
	},
	recommended_actions: [
		{
			action: "resize",
			description: "Resize instance from m5.xlarge to m5.large",
		},
	],
	cli_command:
		"aws ec2 modify-instance-attribute --instance-id i-1234567890abcdef0 --instance-type m5.large",
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources/${pathEncode("res_456")}`,
				params: {},
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
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}/resources/${pathEncode("res_456")}`,
				params: {},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Resource not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Resource not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
