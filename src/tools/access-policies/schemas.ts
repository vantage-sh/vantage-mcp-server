import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";

export const accessPolicyTitle = nonempty();
export const accessPolicyDescription = nonempty().nullable();
export const accessPolicyTeamTokens = z.array(vantageToken("team"));

/**
 * The policy document is nested (`policy.policy.filter`) and its `api_version`
 * is a single-value enum, so tools take the VQL filter on its own and build the
 * document in `execute`.
 */
export const accessPolicyFilter = nonempty();

export const ACCESS_POLICY_API_VERSION = "v1" as const;

export function accessPolicyDocument(filter: string) {
  return {
    api_version: ACCESS_POLICY_API_VERSION,
    policy: { filter },
  };
}
