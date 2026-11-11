import { inventoryOAuthKv } from "../kv-inventory";

// Use a read-only Workers KV API token scoped to the selected account/namespace.
// No credentials, key names, or stored values are printed.
const [accountId, namespaceId] = process.argv.slice(2);
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !namespaceId || !apiToken) {
  throw new Error(
    "Usage: CLOUDFLARE_API_TOKEN=<read-only token> npm run oauth:inventory -- <account-id> <namespace-id>"
  );
}
const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/keys`;
async function main() {
  const counts = await inventoryOAuthKv(async (cursor) => {
    const url = new URL(base);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
    if (!response.ok) throw new Error(`KV inventory request failed: HTTP ${response.status}`);
    const page = (await response.json()) as {
      success: boolean;
      result: { name: string; expiration?: number }[];
      result_info?: { cursor?: string };
    };
    if (!page.success || !Array.isArray(page.result)) throw new Error("KV inventory API returned an invalid page");
    const nextCursor = page.result_info?.cursor;
    return { keys: page.result, cursor: nextCursor, list_complete: !nextCursor };
  });
  console.log(JSON.stringify(counts, null, 2));
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "KV inventory failed");
  process.exitCode = 1;
});
