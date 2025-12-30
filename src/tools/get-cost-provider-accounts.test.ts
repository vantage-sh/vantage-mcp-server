import { expect } from "vitest";
import tool from "./get-cost-provider-accounts";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";
import type { GetCostProviderAccountsResponse } from "../../vantage-ts";

type Validators = ExtractValidators<typeof tool>;

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "just workspace_token",
		data: {
			workspace_token: "wt_123",
			account_id: undefined,
			provider: undefined,
		},
	},
	{
		name: "account_id provided",
		data: {
			workspace_token: "wt_123",
			account_id: "acct_123",
			provider: undefined,
		},
	},
	{
		name: "provider provided",
		data: {
			workspace_token: "wt_123",
			account_id: undefined,
			provider: "aws",
		},
	},
	{
		name: "all arguments provided",
		data: {
			workspace_token: "wt_123",
			account_id: "acct_123",
			provider: "aws",
		},
	},
];

const successData: GetCostProviderAccountsResponse = {
	cost_provider_accounts: [
		{ account_id: "cpa_123", title: "Account 1" },
		{ account_id: "cpa_456", title: "Account 2" },
	],
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	// Success cases

	{
		name: "successful call without filters",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_provider_accounts",
				params: {
					workspace_token: "wt_123",
					account_id: undefined,
					provider: undefined,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				workspace_token: "wt_123",
				account_id: undefined,
				provider: undefined,
			});
			expect(res).toEqual(successData);
		},
	},
	{
		name: "successful call with account_id filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_provider_accounts",
				params: {
					workspace_token: "wt_123",
					account_id: "acct_123",
					provider: undefined,
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				workspace_token: "wt_123",
				account_id: "acct_123",
				provider: undefined,
			});
			expect(res).toEqual(successData);
		},
	},
	{
		name: "successful call with provider filter",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_provider_accounts",
				params: {
					workspace_token: "wt_123",
					account_id: undefined,
					provider: "aws",
				},
				method: "GET",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess({
				workspace_token: "wt_123",
				account_id: undefined,
				provider: "aws",
			});
			expect(res).toEqual(successData);
		},
	},

	// Failure case

	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_provider_accounts",
				params: {
					workspace_token: "wt_123",
					account_id: undefined,
					provider: undefined,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid token" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				workspace_token: "wt_123",
				account_id: undefined,
				provider: undefined,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid token" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
