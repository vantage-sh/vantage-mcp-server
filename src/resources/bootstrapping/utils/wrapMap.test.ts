import { describe, expect, it, test, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import wrapMap from "./wrapMap";

test("wrapMap creates a registration function", () => {
	const testMap = new Map([
		[
			"test-resource",
			{
				content: "# Test Content",
				title: "Test Title",
				description: "Test Description",
			},
		],
	]);

	const result = wrapMap(testMap);
	expect(result).toBeInstanceOf(Function);
});

describe("resource registration", () => {
	it("registers a single resource correctly", () => {
		const testMap = new Map([
			[
				"test-resource",
				{
					content: "# Test Content",
					title: "Test Title",
					description: "Test Description",
				},
			],
		]);

		const mockServer = {
			registerResource: vi.fn(),
		} as unknown as McpServer;

		const registrationFn = wrapMap(testMap);
		registrationFn(mockServer);

		expect(mockServer.registerResource).toHaveBeenCalledOnce();
		expect(mockServer.registerResource).toHaveBeenCalledWith(
			"test-resource",
			"file://vantage/test-resource",
			{
				mimeType: "text/markdown",
				annotations: {
					audience: ["assistant", "user"],
				},
				title: "Test Title",
				description: "Test Description",
			},
			expect.any(Function)
		);
	});

	it("registers multiple resources correctly", () => {
		const testMap = new Map([
			[
				"resource-1",
				{
					content: "# Content 1",
					title: "Title 1",
					description: "Description 1",
				},
			],
			[
				"resource-2",
				{
					content: "# Content 2",
					title: undefined,
					description: undefined,
				},
			],
			[
				"resource-3",
				{
					content: "# Content 3",
					title: "Title 3",
					description: undefined,
				},
			],
		]);

		const mockServer = {
			registerResource: vi.fn(),
		} as unknown as McpServer;

		const registrationFn = wrapMap(testMap);
		registrationFn(mockServer);

		expect(mockServer.registerResource).toHaveBeenCalledTimes(3);
		expect(mockServer.registerResource).toHaveBeenNthCalledWith(
			1,
			"resource-1",
			"file://vantage/resource-1",
			{
				mimeType: "text/markdown",
				annotations: {
					audience: ["assistant", "user"],
				},
				title: "Title 1",
				description: "Description 1",
			},
			expect.any(Function)
		);
		expect(mockServer.registerResource).toHaveBeenNthCalledWith(
			2,
			"resource-2",
			"file://vantage/resource-2",
			{
				mimeType: "text/markdown",
				annotations: {
					audience: ["assistant", "user"],
				},
				title: undefined,
				description: undefined,
			},
			expect.any(Function)
		);
		expect(mockServer.registerResource).toHaveBeenNthCalledWith(
			3,
			"resource-3",
			"file://vantage/resource-3",
			{
				mimeType: "text/markdown",
				annotations: {
					audience: ["assistant", "user"],
				},
				title: "Title 3",
				description: undefined,
			},
			expect.any(Function)
		);
	});

	it("resource handler returns correct content structure", () => {
		const testContent = "# Test Markdown Content\n\nThis is a test.";
		const testMap = new Map([
			[
				"test-resource",
				{
					content: testContent,
					title: "Test Title",
					description: "Test Description",
				},
			],
		]);

		const mockServer = {
			registerResource: vi.fn(),
		} as unknown as McpServer;

		const registrationFn = wrapMap(testMap);
		registrationFn(mockServer);

		const resourceHandler = (mockServer.registerResource as any).mock.calls[0][3];
		const result = resourceHandler();

		expect(result).toEqual({
			contents: [
				{
					uri: "file://vantage/test-resource",
					text: testContent,
					mimeType: "text/markdown",
				},
			],
		});
	});

	it("handles empty map", () => {
		const testMap = new Map();

		const mockServer = {
			registerResource: vi.fn(),
		} as unknown as McpServer;

		const registrationFn = wrapMap(testMap);
		registrationFn(mockServer);

		expect(mockServer.registerResource).not.toHaveBeenCalled();
	});

	it("preserves content exactly as provided", () => {
		const specialContent =
			"# Special\n\n```typescript\nconst x = 'test';\n```\n\n**Bold** _italic_";
		const testMap = new Map([
			[
				"special-resource",
				{
					content: specialContent,
					title: undefined,
					description: undefined,
				},
			],
		]);

		const mockServer = {
			registerResource: vi.fn(),
		} as unknown as McpServer;

		const registrationFn = wrapMap(testMap);
		registrationFn(mockServer);

		const resourceHandler = (mockServer.registerResource as any).mock.calls[0][3];
		const result = resourceHandler();

		expect(result.contents[0].text).toBe(specialContent);
	});
});
