import { expect } from "vitest";
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
		expectedIssues: ["String must contain at least 1 character(s)"],
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
				endpoint: "/v2/recommendations/rec_123",
				params: {},
				method: "GET",
				result: {
					ok: true,
					data: {
						hello: "world",
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				recommendation_token: "rec_123",
			});
			expect(res).toEqual({
				hello: "world",
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations/rec_123",
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
