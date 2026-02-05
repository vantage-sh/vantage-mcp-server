import { expect } from "vitest";
import tool from "./submit-user-feedback";
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
	message: "The MCP server is working great!",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "valid message",
		data: validArguments,
	},
];

const successData = {
	token: "feedback_123",
	created_at: "2023-01-01T00:00:00Z",
	created_by_token: "usr_123",
	message: "Thank you for your feedback!",
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/user_feedback",
				params: {
					message: "The MCP server is working great!",
				},
				method: "POST",
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
				endpoint: "/v2/user_feedback",
				params: {
					message: "The MCP server is working great!",
				},
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Failed to submit feedback" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError(validArguments);
			expect(err.exception).toEqual({
				errors: [{ message: "Failed to submit feedback" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
