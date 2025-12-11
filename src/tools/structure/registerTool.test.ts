import { afterEach, describe, expect, it, test, vi } from "vitest";
import z from "zod";
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
		async execute() {
			return { message: "Hello, World!" };
		},
	};
	const res = registerTool(tool);
	expect(res).toBe(tool);

	const mockServer = {
		tool: vi.fn(),
	} as any;

	const generateContext = vi.fn();

	setupRegisteredTools(mockServer, generateContext);
	expect(mockServer.tool).toHaveBeenCalledWith(
		tool.name,
		tool.description,
		tool.args,
		expect.any(Function)
	);
});

describe("mcp server handler", () => {
	it("passes through MCPUserError correctly", async () => {
		registerTool({
			name: "error-tool",
			description: "A tool that throws an MCPUserError",
			args: {},
			async execute() {
				throw new MCPUserError({ hello: "world" });
			},
		});
		const mockServer = {
			tool: vi.fn(),
		} as any;
		const generateContext = vi.fn();
		setupRegisteredTools(mockServer, generateContext);

		const toolHandler = (mockServer.tool as any).mock.calls.find(
			(call: any) => call[0] === "error-tool"
		)[3];

		const result = await toolHandler({});
		expect(result).toEqual({
			content: [
				{
					mimeType: "application/json",
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
			async execute() {
				throw new Error("Generic error");
			},
		});
		const mockServer = {
			tool: vi.fn(),
		} as any;
		const generateContext = vi.fn();
		setupRegisteredTools(mockServer, generateContext);

		const toolHandler = (mockServer.tool as any).mock.calls.find(
			(call: any) => call[0] === "throw-tool"
		)[3];

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
			async execute(receivedArgs, receivedContext) {
				return { receivedArgs, receivedContext };
			},
		});
		const mockServer = {
			tool: vi.fn(),
		} as any;
		const generateContext = vi.fn(() => context);
		setupRegisteredTools(mockServer, generateContext);

		const toolHandler = (mockServer.tool as any).mock.calls.find(
			(call: any) => call[0] === "arg-tool"
		)[3];

		const result = await toolHandler(args);
		expect(result).toEqual({
			content: [
				{
					mimeType: "application/json",
					text: JSON.stringify({ receivedArgs: args, receivedContext: context }, null, 2),
					type: "text",
				},
			],
			isError: false,
		});
		expect(generateContext).toHaveBeenCalledOnce();
	});
});
