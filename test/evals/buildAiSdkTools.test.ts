import { describe, expect, it } from "vitest";
import { buildAiSdkTools } from "../../evals/_lib/buildAiSdkTools";

describe("buildAiSdkTools", () => {
  it("sets strict: false so OpenAI omits unused optional tool args", () => {
    const tools = buildAiSdkTools(["get-myself"]);
    expect(tools["get-myself"]?.strict).toBe(false);
  });
});
