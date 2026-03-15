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

export type ExtractValidators<T> = T extends ToolProperties<infer V, infer _> ? V : never;

export type ExtractOutputSchema<T> = T extends ToolProperties<infer _, infer O> ? O : undefined;

export type InferValidators<T extends z.ZodRawShape> = {
	[K in keyof T]: z.input<T[K]>;
};

export type SchemaTestTableItem<Validators extends z.ZodRawShape> = {
	name: string;
	data: InferValidators<Validators>;
	expectedIssues?: string[];
};

export type TestHandlerContext<
	Input extends z.ZodRawShape,
	Output extends z.ZodRawShape | undefined,
> = {
	callExpectingSuccess: (
		args: InferValidators<Input>
	) => Promise<
		Output extends undefined
			? Record<string, unknown>
			: z.core.$InferObjectOutput<{ -readonly [P in keyof Output]: Output[P] }, {}>
	>;
	callExpectingError: (args: InferValidators<Input>) => Promise<Error>;
	callExpectingMCPUserError: (args: InferValidators<Input>) => Promise<MCPUserError>;
};

export type ExecutionTestTableItem<
	Input extends z.ZodRawShape,
	Output extends z.ZodRawShape | undefined,
> = {
	name: string;
	handler: (context: TestHandlerContext<Input, Output>) => Promise<void>;
	apiCallHandler?: ToolCallContext["callVantageApi"];
};

export function makeTestHandlerContext<
	Input extends z.ZodRawShape,
	Output extends z.ZodRawShape | undefined,
>(
	inputSchema: Input,
	outputSchema: Output,
	execute: (
		args: z.core.$InferObjectOutput<{ -readonly [P in keyof Input]: Input[P] }, {}>,
		context: ToolCallContext
	) => Promise<
		Output extends undefined
			? Record<string, unknown>
			: z.core.$InferObjectInput<{ -readonly [P in keyof Output]: Output[P] }, {}>
	>,
	apiCallHandler?: ExecutionTestTableItem<Input, Output>["apiCallHandler"]
) {
	const mcpFunctionContext = {
		callVantageApi:
			apiCallHandler ||
			(async () => {
				throw new Error("API call handler not implemented in test case");
			}),
	};

	// We need the schema because some actions transform the input.
	const zodSchema = z.object(inputSchema);

	const toolHandlerContext: TestHandlerContext<Input, Output> = {
		callExpectingSuccess: async (args) => {
			const parsed = zodSchema.parse(args);
			const result = await execute(parsed, mcpFunctionContext);
			if (outputSchema) {
				// TS gets a bit confused by the multiple return types, so we use any here.
				return z.object(outputSchema).parse(result) as any;
			}
			return result as Record<string, unknown>;
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

export function testTool<Input extends z.ZodRawShape, Output extends z.ZodRawShape>(
	tool: ToolProperties<Input, Output>,
	argumentSchemaTests: SchemaTestTableItem<Input>[],
	outputSchemaTests: SchemaTestTableItem<Output>[],
	executionTests: ExecutionTestTableItem<Input, Output>[]
): void;
export function testTool<Input extends z.ZodRawShape, Output extends undefined>(
	tool: ToolProperties<Input, undefined>,
	argumentSchemaTests: SchemaTestTableItem<Input>[],
	executionTests: ExecutionTestTableItem<Input, undefined>[]
): void;
export function testTool<Input extends z.ZodRawShape, Output extends z.ZodRawShape | undefined>(
	tool: ToolProperties<Input, Output>,
	argumentSchemaTests: SchemaTestTableItem<Input>[],
	executionTestsOrSchemaTests: any,
	executionTests?: ExecutionTestTableItem<Input, Output>[]
) {
	let outputSchemaTests: SchemaTestTableItem<any>[] | undefined;
	if (executionTests) {
		outputSchemaTests = executionTestsOrSchemaTests;
	} else {
		executionTests = executionTestsOrSchemaTests as ExecutionTestTableItem<Input, Output>[];
	}

	if (outputSchemaTests) {
		describe(`${tool.name} output schema`, () => {
			for (const testCase of outputSchemaTests) {
				it(testCase.name, () => {
					const result = z.object(tool.outputSchema).safeParse(testCase.data);
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
	}

	describe(`${tool.name} input schema`, () => {
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
			registerTool: vi.fn(),
		} as any;
		const generateContext = vi.fn();

		setupRegisteredTools(mcpServer, generateContext);

		const toolHandler = (mcpServer.registerTool as any).mock.calls.find(
			(call: any) => call[0] === tool.name
		);
		expect(toolHandler).toBeDefined();
		const toolRaw = toolHandler[1];
		expect(toolRaw.description).toBe(tool.description);
		expect(toolRaw.inputSchema).toBe(tool.args);
		expect(toolRaw.outputSchema).toBe(tool.outputSchema);
		expect(toolRaw.annotations).toEqual({
			readOnlyHint: tool.annotations.readOnly,
			openWorldHint: tool.annotations.openWorld,
			destructiveHint: tool.annotations.destructive,
		});
		expect(typeof toolHandler[2]).toBe("function");
	});

	describe(`${tool.name} execution`, () => {
		for (const testCase of executionTests) {
			it(testCase.name, async () => {
				const context = makeTestHandlerContext(
					tool.args,
					tool.outputSchema as Output,
					tool.execute,
					testCase.apiCallHandler
				) as TestHandlerContext<Input, Output>;

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
	result: { data: Response; ok: true } | { errors: unknown[]; ok: false };
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
