import { expect } from "vitest";
import tool from "./list-recommendations";
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
	filter: "open",
	provider: "aws",
	workspace_token: "wt_123",
	provider_account_id: "123456789",
	category: "ec2_rightsizing_recommender",
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			page: 1,
			filter: undefined,
			provider: undefined,
			workspace_token: undefined,
			provider_account_id: undefined,
			category: undefined,
		},
	},
	{
		name: "all valid arguments",
		data: validArguments,
	},
	{
		name: "filter resolved",
		data: {
			...validArguments,
			filter: "resolved",
		},
	},
	{
		name: "filter dismissed",
		data: {
			...validArguments,
			filter: "dismissed",
		},
	},
];

const successData = {
	recommendations: [
		{
			token: "rec_123",
			category: "ec2_rightsizing_recommender",
			description: "Rightsize EC2 instances",
			savings_amount: 150.75,
		},
		{
			token: "rec_456",
			category: "unused_financial_commitments",
			description: "Remove unused Reserved Instances",
			savings_amount: 300.5,
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call with all arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
					category: validArguments.category as any,
				},
				method: "GET",
				result: {
					ok: true,
					data: {
						...successData,
						links: {
							next: "https://example.com?page=2",
						},
					},
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validArguments);
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: true,
					nextPage: 2,
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					category: undefined,
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
			const err = await callExpectingMCPUserError({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				category: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
