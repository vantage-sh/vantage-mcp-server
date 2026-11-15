/**
 * Policy for dynamically registered (RFC 7591) MCP OAuth clients.
 *
 * Registration stays open, and public clients use token_endpoint_auth_method
 * "none" with S256 PKCE. That is how Claude, Cursor, and other installed MCP
 * clients connect. An authorization code is delivered only to a redirect URI
 * registered for that client:
 *
 * - An http loopback redirect is opened on the approving user's own computer.
 *   A remote party who registered the client does not receive it, so loopback
 *   never counts as proof that the client is a known product.
 * - https redirects on hosts we know (claude.ai, cursor.com, chatgpt.com,
 *   vscode.dev, and the aliases below) must use that product's callback path.
 *   Any other path, query, or port on those hosts is rejected so a code cannot
 *   be sent to an arbitrary page there.
 * - Other https origins and custom schemes are still accepted. The consent
 *   screen names the destination and warns that the client is unverified.
 *   Rejecting them would block MCP clients this list does not cover.
 *
 * A client_name is not evidence. The consent screen treats a redirect as a
 * known product only when the name and that exact callback both match.
 */

type CallbackRule = {
  protocol: "https:" | "cursor:";
  hosts: readonly string[];
  /** Exact pathname, or a prefix ending in "/" for a dynamic final segment. */
  path: string;
};

type TrustedClient = {
  /** Matched case-insensitively against a normalized client_name. */
  namePattern: RegExp;
  callbacks: readonly CallbackRule[];
};

const isLoopback = (uri: URL) => uri.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);

// Callback paths checked against vendor docs/reports on 2026-10-06:
// - Claude: https://claude.ai/api/mcp/auth_callback (claude.com may follow); Claude Code uses loopback.
// - Cursor: cursor://anysphere.cursor-mcp/oauth/callback (cursor-retrieval too), newer builds use http://localhost,
//   cloud agents use https://www.cursor.com/agents/mcp/oauth/callback (often sent alongside the others).
// - ChatGPT: https://chatgpt.com/connector_platform_oauth_redirect and /connector/oauth/{callback_id}.
// - VS Code: https://vscode.dev/redirect, https://insiders.vscode.dev/redirect, http://127.0.0.1[:port].
const TRUSTED_CLIENTS: TrustedClient[] = [
  {
    namePattern: /claude/,
    callbacks: [
      {
        protocol: "https:",
        hosts: ["claude.ai", "claude.com"],
        path: "/api/mcp/auth_callback",
      },
    ],
  },
  {
    namePattern: /cursor/,
    callbacks: [
      {
        protocol: "cursor:",
        hosts: ["anysphere.cursor-mcp", "anysphere.cursor-retrieval"],
        path: "/oauth/callback",
      },
      {
        protocol: "https:",
        hosts: ["www.cursor.com", "cursor.com"],
        path: "/agents/mcp/oauth/callback",
      },
    ],
  },
  {
    namePattern: /chatgpt|openai/,
    callbacks: [
      {
        protocol: "https:",
        hosts: ["chatgpt.com"],
        path: "/connector_platform_oauth_redirect",
      },
      {
        protocol: "https:",
        hosts: ["chatgpt.com"],
        path: "/connector/oauth/",
      },
    ],
  },
  {
    namePattern: /vs ?code|visual studio code/,
    callbacks: [
      {
        protocol: "https:",
        hosts: ["vscode.dev", "insiders.vscode.dev"],
        path: "/redirect",
      },
    ],
  },
];

const TRUSTED_HTTPS_CALLBACKS = TRUSTED_CLIENTS.flatMap((client) =>
  client.callbacks.filter((rule) => rule.protocol === "https:")
);

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

function pathMatches(pathname: string, rulePath: string): boolean {
  if (pathname.split("/").includes("..")) return false;
  if (rulePath.endsWith("/")) return pathname.startsWith(rulePath) && pathname.length > rulePath.length;
  return pathname === rulePath;
}

function matchesCallback(url: URL, rule: CallbackRule): boolean {
  if (url.protocol !== rule.protocol || url.username || url.password || url.hash || url.search || url.port)
    return false;
  if (!rule.hosts.includes(url.hostname.toLowerCase())) return false;
  return pathMatches(url.pathname, rule.path);
}

/**
 * True when this redirect is one of the named product's own callbacks.
 * Loopback and other origins never qualify: the consent screen warns for those
 * even when the client_name copies a known product.
 */
export function isRecognisedRedirect(clientName: string | undefined, redirectUri: string): boolean {
  const trusted = claimedClient(clientName);
  const url = parseRedirect(redirectUri);
  if (!trusted || !url) return false;
  return trusted.callbacks.some((rule) => matchesCallback(url, rule));
}

/**
 * True when the client's name claims a well-known client AND every redirect URI
 * is that client's own callback. Only these clients may be shown as recognised.
 */
export function isRecognisedClient(clientName: string | undefined, redirectUris: string[]): boolean {
  if (!claimedClient(clientName) || redirectUris.length === 0) return false;
  return redirectUris.every((uri) => isRecognisedRedirect(clientName, uri));
}

function trustedHostRejection(url: URL): string | undefined {
  if (url.protocol !== "https:") return undefined;
  const rules = TRUSTED_HTTPS_CALLBACKS.filter((rule) => rule.hosts.includes(url.hostname.toLowerCase()));
  if (rules.length === 0) return undefined;
  if (url.port || url.search || !rules.some((rule) => pathMatches(url.pathname, rule.path))) {
    return "redirect_uris on a known application host must use that application's callback path";
  }
  return undefined;
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

  for (const raw of redirectUris) {
    const url = typeof raw === "string" ? parseRedirect(raw) : null;
    if (!url) return "redirect_uris must contain valid absolute URIs";
    if (url.username || url.password) return "redirect_uris must not contain credentials";
    if (url.hash) return "redirect_uris must not contain fragments";
    // Plain http is only acceptable for native clients listening on loopback.
    if (url.protocol === "http:" && !isLoopback(url)) {
      return "redirect_uris must use https, a custom scheme, or an http loopback address";
    }
    const trustedHostError = trustedHostRejection(url);
    if (trustedHostError) return trustedHostError;
  }

  return undefined;
}

/**
 * True when a name claims a well-known client but at least one redirect URI is not one we
 * know for it. Registration is allowed (we can't list every legitimate redirect, and
 * rejecting would break real clients), but the consent screen warns harder and we log it.
 */
export function claimsUnrecognisedBrand(clientName: string | undefined, redirectUris: string[]): boolean {
  return !!claimedClient(clientName) && !isRecognisedClient(clientName, redirectUris);
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
