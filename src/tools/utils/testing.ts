import type {
	Path,
	RequestBodyForPathAndMethod,
	ResponseBodyForPathAndMethod,
	SupportedMethods,
} from "@vantage-sh/vantage-client";
import { describe, expect, it, test, vi } from "vitest";
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import {
	setupRegisteredTools,
	type ToolCallContext,
	type ToolProperties,
} from "../structure/registerTool";

export type ExtractValidators<T> = T extends ToolProperties<infer V> ? V : never;

export type InferValidators<T extends z.ZodRawShape> = {
	[K in keyof T]: z.input<T[K]>;
};

export type SchemaTestTableItem<Validators extends z.ZodRawShape> = {
	name: string;
	data: InferValidators<Validators>;
	expectedIssues?: string[];
};

export type TestHandlerContext<Validators extends z.ZodRawShape> = {
	callExpectingSuccess: (args: InferValidators<Validators>) => Promise<Record<string, unknown>>;
	callExpectingError: (args: InferValidators<Validators>) => Promise<Error>;
	callExpectingMCPUserError: (args: InferValidators<Validators>) => Promise<MCPUserError>;
};

export type ExecutionTestTableItem<Validators extends z.ZodRawShape> = {
	name: string;
	handler: (context: TestHandlerContext<Validators>) => Promise<void>;
	apiCallHandler?: ToolCallContext["callVantageApi"];
};

export function makeTestHandlerContext<Validators extends z.ZodRawShape>(
	validators: Validators,
	execute: (
		args: z.core.$InferObjectOutput<{ -readonly [P in keyof Validators]: Validators[P] }, {}>,
		context: ToolCallContext
	) => Promise<Record<string, unknown>>,
	apiCallHandler?: ExecutionTestTableItem<Validators>["apiCallHandler"]
) {
	const mcpFunctionContext = {
		callVantageApi:
			apiCallHandler ||
			(async () => {
				throw new Error("API call handler not implemented in test case");
			}),
	};

	// We need the schema because some actions transform the input.
	const zodSchema = z.object(validators);

	const toolHandlerContext: TestHandlerContext<Validators> = {
		callExpectingSuccess: async (args) => {
			const parsed = zodSchema.parse(args);
			const result = await execute(parsed, mcpFunctionContext);
			return result;
		},
		callExpectingError: async (args) => {
			try {
				const parsed = zodSchema.parse(args);
				await execute(parsed, mcpFunctionContext);
				throw new Error("Expected error, but got success");
			} catch (e) {
				if (e instanceof MCPUserError) {
					throw new Error(`Expected generic error, but got MCPUserError`);
				}
				if (e instanceof Error) {
					return e;
				}
				throw new Error(`Thrown error is not an instance of Error`);
			}
		},
		callExpectingMCPUserError: async (args) => {
			try {
				const parsed = zodSchema.parse(args);
				await execute(parsed, mcpFunctionContext);
				throw new Error("Expected MCPUserError, but got success");
			} catch (e) {
				if (e instanceof MCPUserError) {
					return e;
				}
				if (e instanceof Error) {
					const error = new Error(
						`Expected MCPUserError, but got generic error: ${e.message}`
					);
					(error as any).cause = e;
					throw error;
				}
				const error = new Error(`Thrown error is not an instance of Error`);
				(error as any).cause = e;
				throw error;
			}
		},
	};

	return toolHandlerContext;
}

export function testTool<Validators extends z.ZodRawShape>(
	tool: ToolProperties<Validators>,
	argumentSchemaTests: SchemaTestTableItem<Validators>[],
	executionTests: ExecutionTestTableItem<Validators>[]
) {
	describe(`${tool.name} argument schema`, () => {
		for (const testCase of argumentSchemaTests) {
			it(testCase.name, () => {
				const result = z.object(tool.args).safeParse(testCase.data);

				if (!result.error) {
					if (testCase.expectedIssues) {
						throw new Error(
							`Expected issues: ${testCase.expectedIssues.join(", ")}, but got none.`
						);
					}

					// No issues as expected
					return;
				}

				const issues = result.error.issues.map((issue) => issue.message).sort();
				const expectedIssues = (testCase.expectedIssues || []).sort();
				expect(issues).toEqual(expectedIssues);
			});
		}
	});

	test(`${tool.name} gets registered correctly`, () => {
		const mcpServer = {
			tool: vi.fn(),
		} as any;
		const generateContext = vi.fn();

		setupRegisteredTools(mcpServer, generateContext);

		const toolHandler = (mcpServer.tool as any).mock.calls.find(
			(call: any) => call[0] === tool.name
		);
		expect(toolHandler).toBeDefined();
		expect(toolHandler[1]).toBe(tool.description);
		expect(toolHandler[2]).toBe(tool.args);
		expect(toolHandler[3]).toEqual({
			readOnlyHint: tool.annotations.readOnly ?? false,
			openWorldHint: tool.annotations.openWorld ?? false,
			destructiveHint: tool.annotations.destructive ?? true,
		});
		expect(typeof toolHandler[4]).toBe("function");
	});

	describe(`${tool.name} execution`, () => {
		for (const testCase of executionTests) {
			it(testCase.name, async () => {
				const context = makeTestHandlerContext(
					tool.args,
					tool.execute,
					testCase.apiCallHandler
				);
				await testCase.handler(context);
			});
		}
	});
}

type ExpectedApiCall<
	P extends Path,
	M extends SupportedMethods<P>,
	Request = RequestBodyForPathAndMethod<P, M>,
	Response = ResponseBodyForPathAndMethod<P, M>,
> = {
	endpoint: P;
	params: Request;
	method: M;
	// FIXME - Only allow undefined on deletes
	result: { data: Response | undefined; ok: true } | { errors: unknown[]; ok: false };
};

type AnyExpectedApiCall = {
	[P in Path]: {
		[M in SupportedMethods<P>]: ExpectedApiCall<P, M>;
	}[SupportedMethods<P>];
}[Path];

export function requestsInOrder(reqs: AnyExpectedApiCall[]): ToolCallContext["callVantageApi"] {
	let callIndex = 0;
	return async <
		P extends Path,
		M extends SupportedMethods<P>,
		Request extends RequestBodyForPathAndMethod<P, M>,
		Response extends ResponseBodyForPathAndMethod<P, M>,
	>(
		endpoint: P,
		params: Request,
		method: M
	): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> => {
		if (callIndex >= reqs.length) {
			throw new Error(
				`Unexpected API call to ${endpoint} with params ${JSON.stringify(params)}`
			);
		}
		const expected = reqs[callIndex];
		if (expected.endpoint !== endpoint || expected.method !== method) {
			throw new Error(
				`Expected API call to ${expected.endpoint} with method ${expected.method}, but got call to ${endpoint} with method ${method}`
			);
		}
		expect(params, "comparing given API Params with actual params in API call").toEqual(
			expected.params
		);
		callIndex++;
		return expected.result as { data: Response; ok: true } | { errors: unknown[]; ok: false };
	};
}

export const dateValidatorPoisoner = {
	value: "not-a-date",
	generateName: (key: string) => `handles invalid date in ${key}`,
	generateIssues: () => ["Invalid date input, must be YYYY-MM-DD format and a reasonable date."],
};

export function poisonOneValue<
	SchemaTestTableItemValidators extends z.ZodRawShape,
	DataType,
	Object extends
		InferValidators<SchemaTestTableItemValidators> = InferValidators<SchemaTestTableItemValidators>,
>(
	obj: Object,
	key: {
		[K in keyof Object]: DataType extends Object[K]
			? K
			: Object[K] extends DataType
				? K
				: never;
	}[keyof Object],
	poisoner: {
		value: DataType;
		generateName: (key: string) => string;
		generateIssues: (key: string) => string[];
	}
): SchemaTestTableItem<SchemaTestTableItemValidators> {
	return {
		name: poisoner.generateName(key as string),
		data: {
			...obj,
			[key]: poisoner.value,
		},
		expectedIssues: poisoner.generateIssues(key as string),
	};
}
