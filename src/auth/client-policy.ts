/**
 * Policy for dynamically registered (RFC 7591) MCP OAuth clients.
 *
 * Registration is open by design, so any client can claim any name. We
 * therefore (1) reject registrations that are unsafe or that claim a
 * well-known client's name without using that client's redirect URIs, and
 * (2) let the consent screen tell users whether a client's redirect target is
 * one we recognise.
 */

type TrustedClient = {
  /** Matched case-insensitively against a normalized client_name. */
  namePattern: RegExp;
  /** Returns true when the redirect URI belongs to this client. */
  matchesRedirect: (uri: URL) => boolean;
};

const isLoopback = (uri: URL) =>
  uri.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);

// Redirect URIs checked against vendor docs/reports on 2026-10-06:
// - Claude: https://claude.ai/api/mcp/auth_callback (claude.com may follow); Claude Code uses loopback.
// - Cursor: cursor://anysphere.cursor-mcp/oauth/callback, newer builds use http://localhost.
// - ChatGPT: https://chatgpt.com/connector_platform_oauth_redirect and /connector/oauth/{callback_id}.
// - VS Code: https://vscode.dev/redirect, https://insiders.vscode.dev/redirect, http://127.0.0.1[:port].
const TRUSTED_CLIENTS: TrustedClient[] = [
  {
    namePattern: /claude/,
    matchesRedirect: (u) =>
      (u.protocol === "https:" && ["claude.ai", "claude.com"].includes(u.hostname)) || isLoopback(u),
  },
  {
    namePattern: /cursor/,
    matchesRedirect: (u) => u.protocol === "cursor:" || isLoopback(u),
  },
  {
    namePattern: /chatgpt|openai/,
    matchesRedirect: (u) => u.protocol === "https:" && u.hostname === "chatgpt.com",
  },
  {
    namePattern: /vs ?code|visual studio code/,
    matchesRedirect: (u) =>
      (u.protocol === "https:" && ["vscode.dev", "insiders.vscode.dev"].includes(u.hostname)) || isLoopback(u),
  },
];

const MAX_NAME_LENGTH = 100;

function normalizeName(name: string): string {
  return name.normalize("NFKC").toLowerCase();
}

function parseRedirect(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

/**
 * Returns the trusted client a name claims to be, if any.
 */
function claimedClient(name: string | undefined): TrustedClient | undefined {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  return TRUSTED_CLIENTS.find((c) => c.namePattern.test(normalized));
}

/**
 * True when the client's name claims a well-known client AND every redirect URI
 * belongs to that client. Only these clients may be shown as recognised.
 */
export function isRecognisedClient(clientName: string | undefined, redirectUris: string[]): boolean {
  const trusted = claimedClient(clientName);
  if (!trusted || redirectUris.length === 0) return false;
  return redirectUris.every((r) => {
    const url = parseRedirect(r);
    return !!url && trusted.matchesRedirect(url);
  });
}

/**
 * Validates DCR metadata. Returns an error description to reject, or undefined to allow.
 */
export function validateClientRegistration(metadata: Record<string, unknown>): string | undefined {
  const name = typeof metadata.client_name === "string" ? metadata.client_name : undefined;
  const redirectUris = Array.isArray(metadata.redirect_uris) ? metadata.redirect_uris : [];

  if (name !== undefined) {
    if (name.length > MAX_NAME_LENGTH) return "client_name is too long";
    // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
    if (/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/.test(name)) {
      return "client_name contains invalid characters";
    }
  }

  const urls: URL[] = [];
  for (const raw of redirectUris) {
    const url = typeof raw === "string" ? parseRedirect(raw) : null;
    if (!url) return "redirect_uris must contain valid absolute URIs";
    if (url.username || url.password) return "redirect_uris must not contain credentials";
    if (url.hash) return "redirect_uris must not contain fragments";
    // Plain http is only acceptable for native clients listening on loopback.
    if (url.protocol === "http:" && !isLoopback(url)) {
      return "redirect_uris must use https, a custom scheme, or an http loopback address";
    }
    urls.push(url);
  }

  const trusted = claimedClient(name);
  if (trusted && !urls.every((u) => trusted.matchesRedirect(u))) {
    return "client_name matches a well-known client but redirect_uris do not belong to it";
  }

  return undefined;
}

/**
 * True when the authorization code would be delivered to the user's own machine,
 * so a remote party who registered the client cannot receive it.
 */
export function isLoopbackRedirect(redirectUri: string): boolean {
  const url = parseRedirect(redirectUri);
  return !!url && isLoopback(url);
}

/**
 * Host (or scheme for custom-scheme URIs) to show prominently on the consent screen.
 */
export function describeRedirectTarget(redirectUri: string): string {
  const url = parseRedirect(redirectUri);
  if (!url) return redirectUri;
  return url.host || `${url.protocol}//`;
}
