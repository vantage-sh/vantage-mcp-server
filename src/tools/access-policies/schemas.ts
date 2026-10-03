import type { CreateAccessPolicyRequest } from "@vantage-sh/vantage-client";
import z from "zod";
import { nonempty, vantageToken } from "../../utils/zod";
import { paginationSchema } from "../../utils/zod/output";

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

export function accessPolicyDocument(filter: string): CreateAccessPolicyRequest["policy"] {
  return {
    api_version: ACCESS_POLICY_API_VERSION,
    policy: { filter },
  };
}

// Output schemas mirror the Vantage client response types.
export const accessPolicyRulesResponseSchema = z.object({
  filter: z.string().describe("Vantage Query Language (VQL) that controls which costs this AccessPolicy allows."),
});

export const accessPolicyDocumentResponseSchema = z.object({
  api_version: z.literal("v1").describe("The AccessPolicy document version."),
  policy: accessPolicyRulesResponseSchema.describe("Policy."),
});

export const accessPolicyResponseSchema = z.object({
  token: z.string().describe("The token identifying this resource."),
  title: z.string().describe("The title of the AccessPolicy."),
  description: z.string().nullable().describe("The description of the AccessPolicy."),
  policy: accessPolicyDocumentResponseSchema.describe("Policy."),
  team_tokens: z.array(z.string()).describe("The tokens for Teams this AccessPolicy is assigned to."),
  created_by: z.string().nullable().describe("The token for the User who created the AccessPolicy."),
  created_at: z.string().describe("The date and time, in UTC, the AccessPolicy was created. ISO 8601 Formatted."),
});

export const listAccessPoliciesResponseSchema = z.object({
  access_policies: z.array(accessPolicyResponseSchema).describe("Access policies."),
  pagination: paginationSchema.describe("Pagination information for these results."),
});

export const accessPolicyOutputSchema = accessPolicyResponseSchema.shape;

export const listAccessPoliciesOutputSchema = listAccessPoliciesResponseSchema.shape;
