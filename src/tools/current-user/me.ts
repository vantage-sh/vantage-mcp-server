import type { GetMeResponse } from "@vantage-sh/vantage-client";

/**
 * Stub for the `is_account_owner` field the Vantage API has not shipped yet.
 * Drop this type and read the field off `GetMeResponse` directly once
 * `@vantage-sh/vantage-client` is regenerated with it.
 */
export type MeWithAccountOwner = GetMeResponse & {
  is_account_owner?: boolean;
};

/**
 * Owner-only tools stay visible unless the API explicitly says the caller is not
 * an owner, so behaviour is unchanged while the field is missing.
 */
export function isDefinitelyNotAccountOwner(me: GetMeResponse): boolean {
  return (me as MeWithAccountOwner).is_account_owner === false;
}
