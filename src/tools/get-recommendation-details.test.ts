import { expect } from "vitest";
import { pathEncode } from "../../vantage-ts";
import tool from "./get-recommendation-details";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "blank string",
		data: {
			recommendation_token: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid recommendation_token",
		data: {
			recommendation_token: "rec_123",
		},
	},
];

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}`,
				params: {},
				method: "GET",
				result: {
					ok: true,
					data: {
						token: "123456789012",
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				recommendation_token: "rec_123",
			});
			expect(res).toEqual({
				token: "123456789012",
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: `/v2/recommendations/${pathEncode("rec_123")}`,
				params: {},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				recommendation_token: "rec_123",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
