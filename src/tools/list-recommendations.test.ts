import { expect } from "vitest";
import tool from "./list-recommendations";
import { DEFAULT_LIMIT } from "./structure/constants";
import {
	type ExecutionTestTableItem,
	type ExtractOutputSchema,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = {
	page: 1,
	filter: "open",
	provider: "aws",
	workspace_token: "wt_123",
	provider_account_id: "123456789",
	type: "aws",
	tag_key: undefined,
	tag_value: undefined,
	regions: undefined,
	provider_ids: undefined,
	account_ids: undefined,
	billing_account_ids: undefined,
	start_date: undefined,
	end_date: undefined,
};

const minimalArgs: InferValidators<Validators> = {
	page: 1,
	filter: undefined,
	provider: undefined,
	workspace_token: undefined,
	provider_account_id: undefined,
	type: undefined,
	tag_key: undefined,
	tag_value: undefined,
	regions: undefined,
	provider_ids: undefined,
	account_ids: undefined,
	billing_account_ids: undefined,
	start_date: undefined,
	end_date: undefined,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: minimalArgs,
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
	{
		name: "tag_key and tag_value together is valid",
		data: {
			...validArguments,
			tag_key: "department",
			tag_value: "engineering",
		},
	},
	{
		name: "start_date and end_date together is valid",
		data: {
			...validArguments,
			start_date: "2024-01-01",
			end_date: "2024-12-31",
		},
	},
	{
		name: "invalid start_date format",
		data: {
			...validArguments,
			start_date: "01-01-2024",
			end_date: "12-31-2024",
		},
		expectedIssues: ["Must be in YYYY-MM-DD format", "Must be in YYYY-MM-DD format"],
	},
	{
		name: "regions array is valid",
		data: {
			...validArguments,
			regions: ["us-east-1", "us-west-2"],
		},
	},
	{
		name: "provider_ids array with aliases is valid",
		data: {
			...validArguments,
			provider_ids: ["aws", "Amazon Web Services", "gcp"],
		},
	},
	{
		name: "account_ids array is valid",
		data: {
			...validArguments,
			account_ids: ["123456789", "987654321"],
		},
	},
	{
		name: "billing_account_ids array is valid",
		data: {
			...validArguments,
			billing_account_ids: ["ba_abc123", "ba_def456"],
		},
	},
];

const successData = {
	recommendations: [
		{
			token: "rec_123",
			type: "aws:ec2:rightsizing",
			category: "ec2_rightsizing_recommender",
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
			category: "unused_financial_commitments",
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

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "successful call with all arguments",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					...validArguments,
					limit: DEFAULT_LIMIT,
					provider: validArguments.provider as any,
					type: validArguments.type as string | undefined,
					provider_ids: validArguments.provider_ids as any,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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
				tag_key: undefined,
				tag_value: undefined,
				regions: undefined,
				provider_ids: undefined,
				account_ids: undefined,
				billing_account_ids: undefined,
				start_date: undefined,
				end_date: undefined,
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

const newFilterTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
	{
		name: "filters by tag_key and tag_value",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					tag_key: "department",
					tag_value: "engineering",
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
				...minimalArgs,
				workspace_token: "wt_123",
				tag_key: "department",
				tag_value: "engineering",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "throws MCPUserError when only tag_key is provided",
		apiCallHandler: requestsInOrder([]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({ ...minimalArgs, tag_key: "department" });
			expect(err.exception).toEqual({
				errors: [{ message: "tag_key and tag_value must both be provided together" }],
			});
		},
	},
	{
		name: "throws MCPUserError when only tag_value is provided",
		apiCallHandler: requestsInOrder([]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({ ...minimalArgs, tag_value: "engineering" });
			expect(err.exception).toEqual({
				errors: [{ message: "tag_key and tag_value must both be provided together" }],
			});
		},
	},
	{
		name: "filters by regions",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					regions: ["us-east-1", "us-west-2"],
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
				...minimalArgs,
				workspace_token: "wt_123",
				regions: ["us-east-1", "us-west-2"],
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "filters by provider_ids with normalization",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					provider_ids: ["aws", "gcp"],
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
				...minimalArgs,
				workspace_token: "wt_123",
				provider_ids: ["Amazon Web Services", "Google Cloud"],
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "filters by account_ids",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					account_ids: ["123456789", "987654321"],
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
				...minimalArgs,
				workspace_token: "wt_123",
				account_ids: ["123456789", "987654321"],
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "filters by billing_account_ids",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					billing_account_ids: ["ba_abc123"],
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
				...minimalArgs,
				workspace_token: "wt_123",
				billing_account_ids: ["ba_abc123"],
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "filters by start_date and end_date",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/recommendations",
				params: {
					page: 1,
					workspace_token: "wt_123",
					start_date: "2024-01-01",
					end_date: "2024-12-31",
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
				...minimalArgs,
				workspace_token: "wt_123",
				start_date: "2024-01-01",
				end_date: "2024-12-31",
			});
			expect(res).toEqual({
				recommendations: successData.recommendations,
				pagination: { hasNextPage: false, nextPage: 0 },
			});
		},
	},
	{
		name: "throws MCPUserError when only start_date is provided",
		apiCallHandler: requestsInOrder([]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				...minimalArgs,
				workspace_token: "wt_123",
				start_date: "2024-01-01",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "start_date and end_date must both be provided together" }],
			});
		},
	},
	{
		name: "throws MCPUserError when only end_date is provided",
		apiCallHandler: requestsInOrder([]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				...minimalArgs,
				workspace_token: "wt_123",
				end_date: "2024-12-31",
			});
			expect(err.exception).toEqual({
				errors: [{ message: "start_date and end_date must both be provided together" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, [...executionTests, ...newFilterTests]);
