import { afterEach, describe, expect, it, test, vi } from "vitest";
import z from "zod";
import MCPUserError from "../../../src/tools/structure/MCPUserError";
import registerTool, {
  clearRegisteredToolsForTesting,
  setupRegisteredTools,
} from "../../../src/tools/structure/registerTool";

afterEach(() => clearRegisteredToolsForTesting());

const mockContext = { callVantageApi: vi.fn() };

test("tool registration works properly", () => {
  const tool = {
    name: "test-tool",
    title: "Test Tool",
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
      title: tool.title,
      description: tool.description,
      inputSchema: expect.objectContaining({ shape: tool.args }),
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: true,
      },
    }),
    expect.any(Function)
  );
});

describe("mcp server handler", () => {
  it("passes through MCPUserError correctly", async () => {
    registerTool({
      name: "error-tool",
      title: "Error Tool",
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

    const toolHandler = (mockServer.registerTool as any).mock.calls.find((call: any) => call[0] === "error-tool")[2];

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
      title: "Throw Tool",
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

    const toolHandler = (mockServer.registerTool as any).mock.calls.find((call: any) => call[0] === "throw-tool")[2];

    await expect(toolHandler({})).rejects.toThrow("Generic error");
  });

  it("runs successfully", async () => {
    const args = { example_arg: "test" };
    const context: any = { hello: "world" };
    registerTool({
      name: "arg-tool",
      title: "Arg Tool",
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

    const toolRaw = (mockServer.registerTool as any).mock.calls.find((call: any) => call[0] === "arg-tool");
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
    title: "Invalid Output Tool",
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
    title: "Valid Output Tool",
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

  const toolRaw = (mockServer.registerTool as any).mock.calls.find((call: any) => call[0] === "valid-output-tool");
  const outputSchemaFromTool = toolRaw[1].outputSchema;
  expect(outputSchemaFromTool).toBeDefined();
  expect(outputSchemaFromTool.shape).toEqual(outputSchema);
});

describe("request cancellation", () => {
  function registerCancellable(execute: any) {
    registerTool({
      name: "cancel-tool",
      title: "Cancel Tool",
      description: "Test",
      args: {},
      annotations: { readOnly: true, destructive: false, openWorld: false },
      execute,
    });
    const mockServer = { registerTool: vi.fn() } as any;
    const ctx = { callVantageApi: vi.fn().mockResolvedValue({ ok: true, data: {} }) };
    setupRegisteredTools(mockServer, () => ctx);
    return { handler: mockServer.registerTool.mock.calls[0][2], ctx };
  }

  it("does not execute an already cancelled request", async () => {
    const execute = vi.fn();
    const { handler } = registerCancellable(execute);
    const signal = AbortSignal.abort(new Error("cancelled"));
    await expect(handler({}, { signal })).rejects.toThrow("cancelled");
    expect(execute).not.toHaveBeenCalled();
  });

  it("stops a later API call after cancellation and keeps the base context isolated", async () => {
    const controller = new AbortController();
    const { handler, ctx } = registerCancellable(async (_args: any, context: any) => {
      await context.callVantageApi("/v2/workspaces", {}, "GET");
      controller.abort(new Error("cancelled"));
      await context.callVantageApi("/v2/workspaces", {}, "GET");
      return {};
    });
    await expect(handler({}, { signal: controller.signal })).rejects.toThrow("cancelled");
    expect(ctx.callVantageApi).toHaveBeenCalledExactlyOnceWith("/v2/workspaces", {}, "GET", controller.signal);
    expect(ctx).not.toHaveProperty("signal");
  });
});
