import type OAuthProvider from "@cloudflare/workers-oauth-provider";
import type { AppEnv } from "../env";
import { logger } from "../logger";

export const OAUTH_CLEANUP_BATCH_SIZE = 50;

/**
 * 0.10.3 restarts each purge at the beginning of KV rather than persisting a
 * cursor. Refuse partial scans: a live prefix could starve the rest forever.
 * Bounding both phases also bounds the tokens revoked with expired grants.
 */
export async function cleanupOAuthKv(
  env: AppEnv,
  provider: Pick<OAuthProvider<AppEnv>, "purgeExpiredData">
): Promise<void> {
  if (env.OAUTH_KV_CLEANUP_ENABLED !== "true") return;

  const grants = await env.OAUTH_KV.list({ prefix: "grant:", limit: OAUTH_CLEANUP_BATCH_SIZE + 1 });
  const tokens = await env.OAUTH_KV.list({ prefix: "token:", limit: OAUTH_CLEANUP_BATCH_SIZE + 1 });
  if (
    !grants.list_complete ||
    !tokens.list_complete ||
    grants.keys.length > OAUTH_CLEANUP_BATCH_SIZE ||
    tokens.keys.length > OAUTH_CLEANUP_BATCH_SIZE
  ) {
    logger.warn("OAuth KV cleanup skipped: namespace exceeds the bounded sweep; a resumable purge is required");
    return;
  }

  const result = await provider.purgeExpiredData(env, { batchSize: OAUTH_CLEANUP_BATCH_SIZE });
  logger
    .withTags({
      oauth_grants_checked: result.grantsChecked,
      oauth_grants_purged: result.grantsPurged,
      oauth_tokens_checked: result.tokensChecked,
      oauth_tokens_purged: result.tokensPurged,
      oauth_cleanup_done: result.done,
    })
    .info("OAuth KV cleanup");
}
