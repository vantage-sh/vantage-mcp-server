import { afterEach, describe, expect, it, test, vi } from "vitest";
import z from "zod/v4";
import MCPUserError from "./MCPUserError";
import registerTool, { clearRegisteredToolsForTesting, setupRegisteredTools } from "./registerTool";

afterEach(() => clearRegisteredToolsForTesting());

test("tool registration works properly", () => {
	const tool = {
		name: "test-tool",
		description: "A test tool",
		args: {
			example_arg: z.string().describe("An example argument"),
		},
		annotations: {
			readOnly: false,
			openWorld: false,
			destructive: true,
		},
		async execute() {
			return { message: "Hello, World!" };
		},
	};
	const res = registerTool(tool);
	expect(res).toBe(tool);

	const mockServer = {
		registerTool: vi.fn(),
	} as any;

	const generateContext = vi.fn();

	setupRegisteredTools(mockServer, generateContext);
	expect(mockServer.registerTool).toHaveBeenCalledWith(
		tool.name,
		expect.objectContaining({
			description: tool.description,
			inputSchema: tool.args,
			annotations: {
				readOnlyHint: false,
				openWorldHint: false,
				destructiveHint: true,
			},
		}),
		expect.any(Function)
	);
});

const mockContext = { env: {}, callVantageApi: vi.fn() };

describe("mcp server handler", () => {
	it("passes through MCPUserError correctly", async () => {
		registerTool({
			name: "error-tool",
			description: "A tool that throws an MCPUserError",
			args: {},
			annotations: {
				readOnly: false,
				openWorld: false,
				destructive: false,
			},
			async execute() {
				throw new MCPUserError({ hello: "world" });
			},
		});
		const mockServer = {
			registerTool: vi.fn(),
		} as any;
		const generateContext = vi.fn(() => mockContext);
		setupRegisteredTools(mockServer, generateContext);

		const toolHandler = (mockServer.registerTool as any).mock.calls.find(
			(call: any) => call[0] === "error-tool"
		)[2];

		const result = await toolHandler({});
		expect(result).toEqual({
			content: [
				{
					text: JSON.stringify({ hello: "world" }, null, 2),
					type: "text",
				},
			],
			isError: true,
		});
	});

	it("throws other errors", async () => {
		registerTool({
			name: "throw-tool",
			description: "A tool that throws a generic error",
			args: {},
			annotations: {
				readOnly: false,
				openWorld: false,
				destructive: false,
			},
			async execute() {
				throw new Error("Generic error");
			},
		});
		const mockServer = {
			registerTool: vi.fn(),
		} as any;
		const generateContext = vi.fn(() => mockContext);
		setupRegisteredTools(mockServer, generateContext);

		const toolHandler = (mockServer.registerTool as any).mock.calls.find(
			(call: any) => call[0] === "throw-tool"
		)[2];

		await expect(toolHandler({})).rejects.toThrow("Generic error");
	});

	it("runs successfully", async () => {
		const args = { example_arg: "test" };
		const context: any = { hello: "world" };
		registerTool({
			name: "arg-tool",
			description: "A tool that returns its arguments and context",
			args: {
				example_arg: z.string().describe("An example argument"),
			},
			annotations: {
				readOnly: true,
				openWorld: true,
				destructive: true,
			},
			async execute(receivedArgs, receivedContext) {
				return { receivedArgs, receivedContext };
			},
		});
		const mockServer = {
			registerTool: vi.fn(),
		} as any;
		const generateContext = vi.fn(() => context);
		setupRegisteredTools(mockServer, generateContext);

		const toolRaw = (mockServer.registerTool as any).mock.calls.find(
			(call: any) => call[0] === "arg-tool"
		);
		const annotations = toolRaw[1].annotations;
		expect(annotations).toEqual({
			readOnlyHint: true,
			openWorldHint: true,
			destructiveHint: true,
		});

		const toolHandler = toolRaw[2];
		const result = await toolHandler(args);
		expect(result).toEqual({
			content: [
				{
					text: JSON.stringify({ receivedArgs: args, receivedContext: context }, null, 2),
					type: "text",
				},
			],
			isError: false,
		});
		expect(generateContext).toHaveBeenCalledOnce();
	});
});

test("tool output schema is typed and loaded properly", () => {
	// @ts-expect-error: This should error because execute does not satisfy outputSchema.
	registerTool({
		name: "invalid-output-tool",
		description: "A tool that returns an invalid output",
		args: {
			example_arg: z.string().describe("An example argument"),
		},
		outputSchema: {
			example_output: z.string().describe("An example output"),
		},
		annotations: {
			readOnly: false,
			openWorld: false,
			destructive: false,
		},
		async execute(receivedArgs) {
			return receivedArgs;
		},
	});

	clearRegisteredToolsForTesting();

	const outputSchema = {
		example_output: z.string().describe("An example output"),
	};
	registerTool({
		name: "valid-output-tool",
		description: "A tool that returns a valid output",
		args: {
			example_arg: z.string().describe("An example argument"),
		},
		outputSchema,
		annotations: {
			readOnly: false,
			openWorld: false,
			destructive: false,
		},
		async execute() {
			return { example_output: "Hello, World!" };
		},
	});
	const mockServer = {
		registerTool: vi.fn(),
	} as any;
	const generateContext = vi.fn();
	setupRegisteredTools(mockServer, generateContext);

	const toolRaw = (mockServer.registerTool as any).mock.calls.find(
		(call: any) => call[0] === "valid-output-tool"
	);
	const outputSchemaFromTool = toolRaw[1].outputSchema;
	expect(outputSchemaFromTool).toBeDefined();
	expect(outputSchemaFromTool).toBe(outputSchema);
});
