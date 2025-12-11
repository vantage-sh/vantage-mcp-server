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

const successData = {
	resources: [
		{
			token: "prvdr_rsrc_123",
			resource_id: "i-1234567890abcdef0",
			resource_type: "EC2Instance",
			provider: "aws",
			provider_account_id: "123456789012",
			billing_account_id: "123456789012",
			region: "us-east-1",
			created_at: "2023-01-15T10:30:00Z",
			metadata: {
				instance_type: "t3.medium",
				state: "running",
				vpc_id: "vpc-12345678",
			},
		},
		{
			token: "prvdr_rsrc_456",
			resource_id: "vol-0987654321fedcba0",
			resource_type: "EBSVolume",
			provider: "aws",
			provider_account_id: "123456789012",
			billing_account_id: "123456789012",
			region: "us-east-1",
			created_at: "2023-01-10T08:15:00Z",
			metadata: {
				volume_type: "gp3",
				size: 100,
				state: "in-use",
				encrypted: true,
			},
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
