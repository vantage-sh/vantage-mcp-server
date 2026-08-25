import { describe, expect, it, vi } from "vitest";
import { finalizeEvalRun } from "../../evals/_lib/evalRunLifecycle";

describe("finalizeEvalRun", () => {
  it("persists assertion failures before cleaning up", async () => {
    const calls: string[] = [];

    const written = await finalizeEvalRun(
      100,
      async () => {
        calls.push("persist");
        return ["failed-results.json"];
      },
      async () => {
        calls.push("cleanup");
      }
    );

    expect(written).toEqual(["failed-results.json"]);
    expect(calls).toEqual(["persist", "cleanup"]);
  });

  it("does not persist output for other nonzero exits", async () => {
    const persistOutput = vi.fn(async () => ["results.json"]);
    const cleanupOutput = vi.fn(async () => undefined);

    await expect(finalizeEvalRun(1, persistOutput, cleanupOutput)).resolves.toBeUndefined();
    expect(persistOutput).not.toHaveBeenCalled();
    expect(cleanupOutput).toHaveBeenCalledOnce();
  });

  it("cleans up when persistence fails", async () => {
    const cleanupOutput = vi.fn(async () => undefined);

    await expect(
      finalizeEvalRun(
        100,
        async () => {
          throw new Error("could not persist output");
        },
        cleanupOutput
      )
    ).rejects.toThrow("could not persist output");
    expect(cleanupOutput).toHaveBeenCalledOnce();
  });
});
