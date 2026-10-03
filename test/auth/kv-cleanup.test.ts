import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { describe, expect, it, vi } from "vitest";
import { cleanupOAuthKv, OAUTH_CLEANUP_BATCH_SIZE } from "../../src/auth/kv-cleanup";
import { inventoryOAuthKv } from "../../src/auth/kv-inventory";
import type { AppEnv } from "../../src/env";

vi.mock("../../src/logger", () => ({ logger: { warn: vi.fn(), withTags: () => ({ info: vi.fn() }) } }));

function makeKv(records: Record<string, object>) {
  const values = new Map(Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)]));
  const kv = {
    async get(key: string, options?: { type?: string }) {
      const value = values.get(key);
      return options?.type === "json" && value ? JSON.parse(value) : (value ?? null);
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number }) {
      const keys = [...values.keys()].filter((name) => name.startsWith(options?.prefix || "")).sort();
      return {
        keys: keys.slice(0, options?.limit).map((name) => ({ name })),
        list_complete: keys.length <= (options?.limit ?? Infinity),
      };
    },
  };
  return { kv, values };
}

describe("OAuth KV cleanup", () => {
  it("does not access storage when disabled", async () => {
    const list = vi.fn();
    const purgeExpiredData = vi.fn();
    await cleanupOAuthKv({ OAUTH_KV: { list } } as unknown as AppEnv, { purgeExpiredData });
    expect(list).not.toHaveBeenCalled();
    expect(purgeExpiredData).not.toHaveBeenCalled();
  });

  it.each(["grants", "tokens", "incomplete"])("skips a partial sweep: %s", async (phase) => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        keys: phase === "grants" ? Array(51).fill({ name: "grant" }) : [],
        list_complete: phase !== "incomplete",
      })
      .mockResolvedValueOnce({
        keys: phase === "tokens" ? Array(51).fill({ name: "token" }) : [],
        list_complete: true,
      });
    const purgeExpiredData = vi.fn();
    await cleanupOAuthKv({ OAUTH_KV: { list }, OAUTH_KV_CLEANUP_ENABLED: "true" } as unknown as AppEnv, {
      purgeExpiredData,
    });
    expect(list).toHaveBeenCalledWith({ prefix: "grant:", limit: OAUTH_CLEANUP_BATCH_SIZE + 1 });
    expect(purgeExpiredData).not.toHaveBeenCalled();
  });

  it("purges expired/orphaned records and preserves active DCR and CIMD grants", async () => {
    const { kv, values } = makeKv({
      "client:live": { clientId: "live" },
      "grant:u:live": { id: "live", userId: "u", clientId: "live" },
      "grant:u:cimd": { id: "cimd", userId: "u", clientId: "https://client.example/metadata.json" },
      "grant:u:expired": { id: "expired", userId: "u", clientId: "live", expiresAt: 1 },
      "grant:u:orphan": { id: "orphan", userId: "u", clientId: "missing" },
      "token:u:live:t": { grantId: "live", userId: "u" },
      "token:u:cimd:t": { grantId: "cimd", userId: "u" },
      "token:u:expired:t": { grantId: "expired", userId: "u" },
      "token:u:missing:t": { grantId: "missing", userId: "u" },
    });
    const env = { OAUTH_KV: kv, OAUTH_KV_CLEANUP_ENABLED: "true" } as unknown as AppEnv;
    const handler = { fetch: async () => new Response("ok") };
    const provider = new OAuthProvider<AppEnv>({
      apiHandler: handler,
      apiRoute: "/mcp",
      defaultHandler: handler,
      authorizeEndpoint: "/authorize",
      tokenEndpoint: "/token",
      refreshTokenTTL: undefined,
      clientRegistrationTTL: undefined,
    });
    await cleanupOAuthKv(env, provider);
    expect([...values.keys()].sort()).toEqual([
      "client:live",
      "grant:u:cimd",
      "grant:u:live",
      "token:u:cimd:t",
      "token:u:live:t",
    ]);
  });

  it("surfaces storage failures to the scheduled handler", async () => {
    const list = vi.fn().mockRejectedValue(new Error("KV unavailable"));
    await expect(
      cleanupOAuthKv({ OAUTH_KV: { list }, OAUTH_KV_CLEANUP_ENABLED: "true" } as unknown as AppEnv, {
        purgeExpiredData: vi.fn(),
      })
    ).rejects.toThrow("KV unavailable");
  });
});

describe("read-only inventory", () => {
  it("follows empty pages and reports counts without exposing key names", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        keys: [{ name: "client:secret" }, { name: "grant:user:secret" }],
        list_complete: false,
        cursor: "page2",
      })
      .mockResolvedValueOnce({ keys: [], list_complete: false, cursor: "page3" })
      .mockResolvedValueOnce({
        keys: [{ name: "token:secret", expiration: 10 }, { name: "other" }],
        list_complete: true,
      });
    expect(await inventoryOAuthKv(list, 20)).toEqual({
      clients: 1,
      grants: 1,
      tokens: 1,
      other: 1,
      expiredKeys: 1,
      total: 4,
    });
    expect(list.mock.calls).toEqual([[undefined], ["page2"], ["page3"]]);
  });
  it("rejects broken pagination", async () => {
    await expect(inventoryOAuthKv(async () => ({ keys: [], list_complete: false }))).rejects.toThrow(
      "pagination did not advance"
    );
  });
});
