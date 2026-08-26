import { describe, expect, it } from "vitest";
import {
  formatApprovedModels,
  modelIdFromLabel,
  normalizeModelSlug,
  parseModelSpec,
  providerOptionsFor,
} from "../../evals/_lib/models";

describe("normalizeModelSlug", () => {
  it("turns dotted variant/effort separators into hyphens", () => {
    expect(normalizeModelSlug("gpt-5.6.sol-high")).toBe("gpt-5.6-sol-high");
    expect(normalizeModelSlug(" GPT-5.6-SOL-HIGH ")).toBe("gpt-5.6-sol-high");
  });
});

describe("parseModelSpec", () => {
  it("accepts a model with an effort suffix", () => {
    expect(parseModelSpec("gpt-5.6-sol-high")).toEqual({
      id: "gpt-5.6-sol-high",
      modelId: "gpt-5.6-sol",
      provider: "openai",
      effort: "high",
    });
  });

  it("accepts the dotted form used in some CLIs", () => {
    expect(parseModelSpec("gpt-5.6.sol-high").id).toBe("gpt-5.6-sol-high");
  });

  it("treats a bare approved id as the provider default (no effort)", () => {
    expect(parseModelSpec("gpt-5.6-sol")).toEqual({
      id: "gpt-5.6-sol",
      modelId: "gpt-5.6-sol",
      provider: "openai",
    });
  });

  it("accepts models that have no effort levels", () => {
    expect(parseModelSpec("claude-haiku-4-5")).toEqual({
      id: "claude-haiku-4-5",
      modelId: "claude-haiku-4-5",
      provider: "anthropic",
    });
  });

  it("rejects effort on a model that does not support it", () => {
    expect(() => parseModelSpec("claude-haiku-4-5-high")).toThrow(/does not support effort/);
  });

  it("rejects an unknown effort for an approved model", () => {
    expect(() => parseModelSpec("gpt-5.6-sol-ultra")).toThrow(/Unknown effort "ultra"/);
  });

  it("rejects a model that is not on the approved list", () => {
    expect(() => parseModelSpec("gpt-4o")).toThrow(/Unknown eval model/);
    expect(() => parseModelSpec("gpt-4o")).toThrow(formatApprovedModels());
  });
});

describe("providerOptionsFor", () => {
  it("maps OpenAI effort to reasoningEffort", () => {
    expect(providerOptionsFor(parseModelSpec("gpt-5.6-sol-high"))).toEqual({
      openai: { reasoningEffort: "high" },
    });
  });

  it("maps Anthropic effort to effort", () => {
    expect(providerOptionsFor(parseModelSpec("claude-sonnet-5-medium"))).toEqual({
      anthropic: { effort: "medium" },
    });
  });

  it("omits provider options when effort is not set", () => {
    expect(providerOptionsFor(parseModelSpec("gpt-5.6-sol"))).toBeUndefined();
    expect(providerOptionsFor(parseModelSpec("claude-haiku-4-5"))).toBeUndefined();
  });
});

describe("modelIdFromLabel", () => {
  it("reads the combo slug from a provider label", () => {
    expect(modelIdFromLabel("gpt-5.6-sol-high · isolated")).toBe("gpt-5.6-sol-high");
  });
});
