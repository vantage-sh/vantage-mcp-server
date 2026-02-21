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
	type: "aws",
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
			type: undefined,
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
	{
		name: "type over 255 chars is invalid",
		data: {
			...validArguments,
			type: "a".repeat(256),
		},
		expectedIssues: ["Too big: expected string to have <=255 characters"],
	},
	{
		name: "type with fuzzy value",
		data: {
			...validArguments,
			type: "aws:ec2:rightsizing",
		},
	},
	{
		name: "provider alias value",
		data: {
			...validArguments,
			provider: "Amazon Web Services",
		},
	},
	{
		name: "natural language type value",
		data: {
			...validArguments,
			type: "AWS recommendations",
		},
	},
	{
		name: "multi-word provider alias type value",
		data: {
			...validArguments,
			type: "Google Cloud Recommendations",
		},
	},
	{
		name: "legacy category identifier type value",
		data: {
			...validArguments,
			type: "ec2_rightsizing_recommender",
		},
	},
	{
		name: "upper-case legacy category identifier type value",
		data: {
			...validArguments,
			type: "SAVINGS_PLAN",
		},
	},
];

const successData = {
	recommendations: [
		{
			token: "rec_123",
			type: "aws:ec2:rightsizing",
			description: "Rightsize EC2 instances",
			created_at: "2023-01-01T00:00:00Z",
			potential_savings: null,
			provider: "aws",
			provider_account_id: "123456789",
			service: "EC2",
			resources_affected_count: 10,
			currency_code: "USD",
			currency_symbol: "$",
			workspace_token: "wt_123",
		},
		{
			token: "rec_456",
			type: "aws:ec2",
			description: "Remove unused Reserved Instances",
			created_at: "2023-01-01T00:00:00Z",
			potential_savings: null,
			provider: "aws",
			provider_account_id: "123456789",
			service: "EC2",
			resources_affected_count: 10,
			currency_code: "USD",
			currency_symbol: "$",
			workspace_token: "wt_123",
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
					provider: validArguments.provider as any,
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
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: undefined,
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
				type: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Access denied" }],
			});
		},
	},
	{
		name: "successful call with type filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "aws",
					limit: DEFAULT_LIMIT,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "aws",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "normalizes provider alias and natural language type",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: "aws",
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "aws",
					limit: DEFAULT_LIMIT,
				} as any,
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: "Amazon Web Services",
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "AWS recommendations",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "normalizes google cloud recommendation type alias",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "gcp",
					limit: DEFAULT_LIMIT,
				} as any,
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "Google Cloud Recommendations",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "normalizes amazon web services recommendation type alias",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "aws",
					limit: DEFAULT_LIMIT,
				} as any,
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "Amazon Web Services Recommendations",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "maps legacy category identifier to canonical type",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "aws:ec2:rightsizing",
					limit: DEFAULT_LIMIT,
				} as any,
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "ec2_rightsizing_recommender",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "does not fabricate suffixes for multi-word provider aliases",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					filter: undefined,
					provider: undefined,
					workspace_token: undefined,
					provider_account_id: undefined,
					type: "gcp",
					limit: DEFAULT_LIMIT,
				} as any,
				method: "GET",
				result: {
					ok: true,
					data: successData as any,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				page: 1,
				filter: undefined,
				provider: undefined,
				workspace_token: undefined,
				provider_account_id: undefined,
				type: "Google Cloud Compute Rightsizing Recommendations",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
