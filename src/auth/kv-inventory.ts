export type InventoryPage = {
  keys: { name: string; expiration?: number }[];
  list_complete: boolean;
  cursor?: string;
};

/** Reads only key metadata, never grant, client or token values. */
export async function inventoryOAuthKv(
  list: (cursor?: string) => Promise<InventoryPage>,
  now = Math.floor(Date.now() / 1000)
) {
  const counts = { clients: 0, grants: 0, tokens: 0, other: 0, expiredKeys: 0, total: 0 };
  let cursor: string | undefined;
  do {
    const page = await list(cursor);
    for (const key of page.keys) {
      counts.total++;
      if (key.name.startsWith("client:")) counts.clients++;
      else if (key.name.startsWith("grant:")) counts.grants++;
      else if (key.name.startsWith("token:")) counts.tokens++;
      else counts.other++;
      if (key.expiration !== undefined && key.expiration <= now) counts.expiredKeys++;
    }
    if (page.list_complete) return counts;
    if (!page.cursor || page.cursor === cursor) throw new Error("OAuth KV inventory pagination did not advance");
    cursor = page.cursor;
  } while (cursor);
  return counts;
}
