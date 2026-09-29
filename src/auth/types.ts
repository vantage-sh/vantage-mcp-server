import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import type { JWTPayload } from "jose";

export type UserProps = {
  claims: JWTPayload;
  tokenSet: {
    accessToken: string;
    accessTokenTTL?: number;
    idToken?: string;
    refreshToken?: string;
  };
};

export type Auth0AuthRequest = {
  mcpAuthRequest: AuthRequest;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  transactionState: string;
  consentToken: string;
};
