import { type GetRecommendationResponse, pathEncode } from "@vantage-sh/vantage-client";
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
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "valid recommendation_token",
		data: {
			recommendation_token: "rec_123",
		},
	},
];

const successData: GetRecommendationResponse = {
	token: "rec_123",
	description: "This is a test recommendation",
	category: "ec2_rightsizing_recommender",
	created_at: "2023-01-01T00:00:00Z",
	potential_savings: null,
	provider: "aws",
	provider_account_id: "123456789",
	service: "EC2",
	resources_affected_count: "10",
	workspace_token: "wt_123",
};

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
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				recommendation_token: "rec_123",
			});
			expect(res).toEqual(successData);
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
