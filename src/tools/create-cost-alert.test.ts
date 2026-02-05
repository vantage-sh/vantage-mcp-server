import { expect } from "vitest";
import tool from "./create-cost-alert";
import {
	type ExecutionTestTableItem,
	type ExtractValidators,
	type InferValidators,
	requestsInOrder,
	type SchemaTestTableItem,
	testTool,
} from "./utils/testing";

type Validators = ExtractValidators<typeof tool>;

const undefineds = {
	email_recipients: undefined,
	slack_channels: undefined,
	teams_channels: undefined,
	minimum_threshold: undefined,
};

const validInputArguments: InferValidators<Validators> = {
	title: "Daily AWS Alert",
	interval: "day",
	threshold: 100,
	unit_type: "currency",
	workspace_token: "wrkspc_123",
	report_tokens: ["rprt_123"],
	email_recipients: ["user@example.com"],
	slack_channels: ["#alerts"],
	teams_channels: ["General"],
	minimum_threshold: 50,
};

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
	{
		name: "minimal valid arguments",
		data: {
			...undefineds,
			title: "Minimal Alert",
			interval: "day",
			threshold: 100,
			unit_type: "currency",
			workspace_token: "wrkspc_123",
			report_tokens: ["rprt_123"],
		},
	},
	{
		name: "all valid arguments",
		data: validInputArguments,
	},
	{
		name: "empty title",
		data: {
			...validInputArguments,
			title: "",
		},
		expectedIssues: ["Too small: expected string to have >=1 characters"],
	},
	{
		name: "title too long",
		data: {
			...validInputArguments,
			title: "a".repeat(256),
		},
		expectedIssues: ["Too big: expected string to have <=255 characters"],
	},
	{
		name: "invalid interval",
		data: {
			...validInputArguments,
			interval: "yearly" as any,
		},
		expectedIssues: ['Invalid option: expected one of "day"|"week"|"month"|"quarter"'],
	},
	{
		name: "invalid unit_type",
		data: {
			...validInputArguments,
			unit_type: "tokens" as any,
		},
		expectedIssues: ['Invalid option: expected one of "currency"|"percentage"'],
	},
	{
		name: "threshold must be greater than 0",
		data: {
			...validInputArguments,
			threshold: 0,
		},
		expectedIssues: ["Too small: expected number to be >0"],
	},
	{
		name: "negative threshold",
		data: {
			...validInputArguments,
			threshold: -10,
		},
		expectedIssues: ["Too small: expected number to be >0"],
	},
	{
		name: "empty report_tokens",
		data: {
			...validInputArguments,
			report_tokens: [],
		},
		expectedIssues: ["Too small: expected array to have >=1 items"],
	},
	{
		name: "too many report_tokens",
		data: {
			...validInputArguments,
			report_tokens: Array.from({ length: 11 }, (_, i) => `rprt_${i}`),
		},
		expectedIssues: ["Too big: expected array to have <=10 items"],
	},
	{
		name: "negative minimum_threshold",
		data: {
			...validInputArguments,
			minimum_threshold: -1,
		},
		expectedIssues: ["Too small: expected number to be >=0"],
	},
	{
		name: "minimum_threshold of zero is valid",
		data: {
			...validInputArguments,
			minimum_threshold: 0,
		},
	},
	{
		name: "quarter interval is valid",
		data: {
			...undefineds,
			title: "Quarterly Alert",
			interval: "quarter",
			threshold: 5000,
			unit_type: "percentage",
			workspace_token: "wrkspc_456",
			report_tokens: ["rprt_789"],
		},
	},
];

const successData = {
	cost_alert: {
		token: "cstm_alrt_rl_123",
		title: "Daily AWS Alert",
		interval: "day",
		threshold: 100,
		unit_type: "currency",
		workspace_token: "wrkspc_123",
		report_tokens: ["rprt_123"],
	},
};

const executionTests: ExecutionTestTableItem<Validators>[] = [
	{
		name: "successful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_alerts",
				params: validInputArguments,
				method: "POST",
				result: {
					ok: true,
					data: successData,
				},
			},
		]),
		handler: async ({ callExpectingSuccess }) => {
			const res = await callExpectingSuccess(validInputArguments);
			expect(res).toEqual(successData);
		},
	},
	{
		name: "unsuccessful call",
		apiCallHandler: requestsInOrder([
			{
				endpoint: "/v2/cost_alerts",
				params: {
					title: "Bad Alert",
					interval: "day",
					threshold: 100,
					unit_type: "currency",
					workspace_token: "wrkspc_bad",
					report_tokens: ["rprt_nonexistent"],
				},
				method: "POST",
				result: {
					ok: false,
					errors: [{ message: "Report not found" }],
				},
			},
		]),
		handler: async ({ callExpectingMCPUserError }) => {
			const err = await callExpectingMCPUserError({
				...undefineds,
				title: "Bad Alert",
				interval: "day",
				threshold: 100,
				unit_type: "currency",
				workspace_token: "wrkspc_bad",
				report_tokens: ["rprt_nonexistent"],
			});
			expect(err.exception).toEqual({
				errors: [{ message: "Report not found" }],
			});
		},
	},
];

testTool(tool, argumentSchemaTests, executionTests);
