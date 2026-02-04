import type { GetReportResourcesResponse } from "@vantage-sh/vantage-client";
import { expect } from "vitest";
import tool from "./list-provider-resources";
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
	resource_report_token: undefined,
	filter: undefined,
	workspace_token: undefined,
	include_cost: false,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "default page with resource report",
		data: {
			page: 1,
			resource_report_token: "rr_123",
			filter: undefined,
			workspace_token: undefined,
			include_cost: false,
		},
	},
	{
		name: "with VQL filter and workspace token",
		data: {
			page: 1,
			resource_report_token: undefined,
			filter: "(resources.provider = 'aws' AND resources.type = 'EC2Instance')",
			workspace_token: "wt_123",
			include_cost: false,
		},
	},
	{
		name: "with cost breakdown",
		data: {
			page: 2,
			resource_report_token: "rr_456",
			filter: undefined,
			workspace_token: undefined,
			include_cost: true,
		},
	},
	{
		name: "minimal valid arguments",
		data: validArguments,
	},
	{
		name: "higher page number",
		data: {
			page: 5,
			resource_report_token: "rr_789",
			filter: undefined,
			workspace_token: undefined,
			include_cost: false,
		},
	},
];

const successData: GetReportResourcesResponse = {
	resources: [
		{
			token: "prvdr_rsrc_123",
			uuid: "i-1234567890abcdef0",
			type: "aws_instance",
			label: "i-1234567890abcdef0",
			metadata: null,
			account_id: "123456789012",
			billing_account_id: "123456789012",
			provider: "aws",
			region: "us-east-1",
			created_at: "2023-01-15T10:30:00Z",
		},
		{
			token: "prvdr_rsrc_456",
			uuid: "vol-0987654321fedcba0",
			type: "aws_volume",
			label: "vol-0987654321fedcba0",
			metadata: null,
			account_id: "123456789012",
			billing_account_id: "123456789012",
			provider: "aws",
			region: "us-east-1",
			created_at: "2023-01-15T10:30:00Z",
		},
	],
	links: {},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/resources",
				params: {
					page: 1,
					resource_report_token: "rr_123",
					filter: undefined,
					workspace_token: undefined,
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
			const res = await callExpectingSuccess({
				page: 1,
				resource_report_token: "rr_123",
				filter: undefined,
				workspace_token: undefined,
				include_cost: false,
			});
			expect(res).toEqual({
				resources: successData.resources,
				pagination: {
					hasNextPage: false,
					nextPage: 0,
				},
			});
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/resources",
				params: {
					page: 1,
					resource_report_token: undefined,
					filter: "invalid VQL syntax",
					workspace_token: "wt_123",
					include_cost: false,
				},
				method: "GET",
				result: {
					ok: false,
					errors: [{ message: "Invalid VQL filter syntax" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				page: 1,
				resource_report_token: undefined,
				filter: "invalid VQL syntax",
				workspace_token: "wt_123",
				include_cost: false,
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Invalid VQL filter syntax" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
