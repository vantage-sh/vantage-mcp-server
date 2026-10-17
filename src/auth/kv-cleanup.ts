import { getOAuthApi, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { AppEnv } from "../env";
import { logger } from "../logger";

export const OAUTH_CLEANUP_STATE_KEY = "gc:oauth-cleanup";

/**
 * Keys inspected per invocation. Each key costs up to three KV operations
 * (record, owning client/grant, delete), and a revoked grant also lists and
 * deletes its tokens, so this stays well inside the 1,000-operation limit.
 */
export const OAUTH_CLEANUP_KEY_BUDGET = 200;

type Phase = "grant" | "token";
type SweepState = { phase: Phase; cursor?: string };
type GrantRecord = { id: string; userId: string; clientId: string; expiresAt?: number };
type TokenRecord = { grantId: string; userId: string };

const noRoutes = { fetch: () => new Response(null, { status: 404 }) };

// revokeGrant only touches OAUTH_KV, but the provider still validates routing options.
function storageHelpers(env: AppEnv): Pick<OAuthHelpers, "revokeGrant"> {
  return getOAuthApi<AppEnv>(
    {
      apiRoute: "/mcp",
      apiHandler: noRoutes,
      defaultHandler: noRoutes,
      authorizeEndpoint: "/authorize",
      tokenEndpoint: "/token",
    },
    env
  );
}

// CIMD clients are identified by an HTTPS URL and have no KV client record.
function isClientMetadataUrl(clientId: string): boolean {
  try {
    return new URL(clientId).protocol === "https:";
  } catch {
    return false;
  }
}

async function readState(kv: KVNamespace): Promise<SweepState> {
  const state = await kv.get<SweepState>(OAUTH_CLEANUP_STATE_KEY, "json");
  if (state && (state.phase === "grant" || state.phase === "token")) return state;
  return { phase: "grant" };
}

/**
 * Removes expired and orphaned grants, then tokens whose grant no longer
 * exists. Provider 0.10.3's purgeExpiredData restarts from the beginning of the
 * namespace on every call, so this sweep persists its list cursor and resumes
 * where the previous invocation stopped.
 */
export async function cleanupOAuthKv(
  env: AppEnv,
  helpers?: Pick<OAuthHelpers, "revokeGrant">,
  budget = OAUTH_CLEANUP_KEY_BUDGET,
  now = Math.floor(Date.now() / 1000)
): Promise<void> {
  if (env.OAUTH_KV_CLEANUP_ENABLED !== "true") return;
  const kv = env.OAUTH_KV;
  const revoker = helpers ?? storageHelpers(env);
  const clientExists = new Map<string, boolean>();
  const grantExists = new Map<string, boolean>();
  const stats = { grantsChecked: 0, grantsPurged: 0, tokensChecked: 0, tokensPurged: 0, passCompleted: false };

  let state = await readState(kv);
  let checked = 0;
  while (checked < budget) {
    let page: KVNamespaceListResult<unknown, string>;
    try {
      page = await kv.list({
        prefix: `${state.phase}:`,
        limit: Math.min(1000, budget - checked),
        cursor: state.cursor,
      });
    } catch (error) {
      if (!state.cursor) throw error;
      logger.warn("OAuth KV cleanup cursor rejected; restarting phase");
      state = { phase: state.phase };
      continue;
    }

    for (const key of page.keys) {
      checked++;
      if (state.phase === "grant") {
        stats.grantsChecked++;
        const grant = await kv.get<GrantRecord>(key.name, "json");
        if (!grant) continue;
        const expired = grant.expiresAt !== undefined && now >= grant.expiresAt;
        let orphaned = false;
        if (!expired && !isClientMetadataUrl(grant.clientId)) {
          if (!clientExists.has(grant.clientId)) {
            clientExists.set(grant.clientId, (await kv.get(`client:${grant.clientId}`)) !== null);
          }
          orphaned = !clientExists.get(grant.clientId);
        }
        if (expired || orphaned) {
          await revoker.revokeGrant(grant.id, grant.userId);
          stats.grantsPurged++;
        }
      } else {
        stats.tokensChecked++;
        const token = await kv.get<TokenRecord>(key.name, "json");
        if (!token) continue;
        const grantKey = `grant:${token.userId}:${token.grantId}`;
        if (!grantExists.has(grantKey)) grantExists.set(grantKey, (await kv.get(grantKey)) !== null);
        if (!grantExists.get(grantKey)) {
          await kv.delete(key.name);
          stats.tokensPurged++;
        }
      }
    }

    if (page.list_complete) {
      if (state.phase === "token") {
        state = { phase: "grant" };
        stats.passCompleted = true;
        break;
      }
      state = { phase: "token" };
    } else {
      if (!page.cursor || page.cursor === state.cursor) throw new Error("OAuth KV cleanup pagination did not advance");
      state = { phase: state.phase, cursor: page.cursor };
    }
  }

  await kv.put(OAUTH_CLEANUP_STATE_KEY, JSON.stringify(state));
  logger
    .withTags({
      oauth_grants_checked: stats.grantsChecked,
      oauth_grants_purged: stats.grantsPurged,
      oauth_tokens_checked: stats.tokensChecked,
      oauth_tokens_purged: stats.tokensPurged,
      oauth_cleanup_pass_completed: stats.passCompleted,
      oauth_cleanup_next_phase: state.phase,
    })
    .info("OAuth KV cleanup");
}
