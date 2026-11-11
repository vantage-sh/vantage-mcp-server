import { describe, expect, it, vi } from "vitest";
import { cleanupOAuthKv, OAUTH_CLEANUP_STATE_KEY } from "../../src/auth/kv-cleanup";
import { inventoryOAuthKv } from "../../src/auth/kv-inventory";
import type { AppEnv } from "../../src/env";

vi.mock("../../src/logger", () => ({ logger: { warn: vi.fn(), withTags: () => ({ info: vi.fn() }) } }));

function makeKv(records: Record<string, object>) {
  const values = new Map(Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)]));
  const kv = {
    async get(key: string, options?: string | { type?: string }) {
      const value = values.get(key);
      const type = typeof options === "string" ? options : options?.type;
      return type === "json" && value ? JSON.parse(value) : (value ?? null);
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
    list: vi.fn(async (options?: { prefix?: string; limit?: number; cursor?: string }) => {
      const keys = [...values.keys()].filter((name) => name.startsWith(options?.prefix || "")).sort();
      const start = options?.cursor ? Number(options.cursor) : 0;
      const end = start + (options?.limit ?? 1000);
      const complete = end >= keys.length;
      return {
        keys: keys.slice(start, end).map((name) => ({ name })),
        list_complete: complete,
        ...(complete ? {} : { cursor: String(end) }),
      };
    }),
  };
  return { kv, values };
}

const records = {
  "client:live": { clientId: "live" },
  "grant:u:cimd": { id: "cimd", userId: "u", clientId: "https://client.example/metadata.json" },
  "grant:u:expired": { id: "expired", userId: "u", clientId: "live", expiresAt: 1 },
  "grant:u:live": { id: "live", userId: "u", clientId: "live" },
  "grant:u:orphan": { id: "orphan", userId: "u", clientId: "missing" },
  "token:u:cimd:t": { grantId: "cimd", userId: "u" },
  "token:u:expired:t": { grantId: "expired", userId: "u" },
  "token:u:live:t": { grantId: "live", userId: "u" },
  "token:u:missing:t": { grantId: "missing", userId: "u" },
};

const survivors = ["client:live", "grant:u:cimd", "grant:u:live", "token:u:cimd:t", "token:u:live:t"];

function enabledEnv(kv: unknown) {
  return { OAUTH_KV: kv, OAUTH_KV_CLEANUP_ENABLED: "true" } as unknown as AppEnv;
}

function oauthKeys(values: Map<string, string>) {
  return [...values.keys()].filter((key) => key !== OAUTH_CLEANUP_STATE_KEY).sort();
}

describe("OAuth KV cleanup", () => {
  it("does not access storage when disabled", async () => {
    const get = vi.fn();
    const list = vi.fn();
    await cleanupOAuthKv({ OAUTH_KV: { get, list } } as unknown as AppEnv);
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("purges expired/orphaned records with the provider and preserves active DCR and CIMD grants", async () => {
    const { kv, values } = makeKv(records);
    await cleanupOAuthKv(enabledEnv(kv));
    expect(oauthKeys(values)).toEqual(survivors);
    expect(JSON.parse(values.get(OAUTH_CLEANUP_STATE_KEY)!)).toEqual({ phase: "grant" });
  });

  it("resumes from the persisted cursor across invocations", async () => {
    const { kv, values } = makeKv(records);
    const env = enabledEnv(kv);
    await cleanupOAuthKv(env, undefined, 2);
    expect(JSON.parse(values.get(OAUTH_CLEANUP_STATE_KEY)!)).toEqual({ phase: "grant", cursor: "2" });
    expect(values.has("grant:u:expired")).toBe(false);
    expect(values.has("grant:u:orphan")).toBe(true);

    const callsBefore = kv.list.mock.calls.length;
    await cleanupOAuthKv(env, undefined, 2);
    expect(kv.list.mock.calls[callsBefore][0]).toEqual(expect.objectContaining({ prefix: "grant:", cursor: "2" }));
    expect(values.has("grant:u:orphan")).toBe(false);

    for (let run = 0; run < 3; run++) await cleanupOAuthKv(env, undefined, 2);
    expect(oauthKeys(values)).toEqual(survivors);
    expect(JSON.parse(values.get(OAUTH_CLEANUP_STATE_KEY)!)).toEqual({ phase: "grant" });
  });

  it("restarts a phase when KV rejects a persisted cursor", async () => {
    const { kv, values } = makeKv({ ...records, [OAUTH_CLEANUP_STATE_KEY]: { phase: "token", cursor: "stale" } });
    kv.list.mockRejectedValueOnce(new Error("invalid cursor"));
    await cleanupOAuthKv(enabledEnv(kv));
    expect(kv.list.mock.calls[1][0]).toEqual(expect.objectContaining({ prefix: "token:", cursor: undefined }));
    expect(values.has("token:u:missing:t")).toBe(false);
  });

  it("uses injected helpers to revoke grants", async () => {
    const { kv } = makeKv(records);
    const revokeGrant = vi.fn();
    await cleanupOAuthKv(enabledEnv(kv), { revokeGrant });
    expect(revokeGrant.mock.calls).toEqual([
      ["expired", "u"],
      ["orphan", "u"],
    ]);
  });

  it("surfaces storage failures to the scheduled handler", async () => {
    const list = vi.fn().mockRejectedValue(new Error("KV unavailable"));
    await expect(
      cleanupOAuthKv(enabledEnv({ get: vi.fn().mockResolvedValue(null), list }), { revokeGrant: vi.fn() })
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
