/**
 * Policy for dynamically registered (RFC 7591) MCP OAuth clients.
 *
 * Registration is open by design, so any client can claim any name. We
 * therefore (1) reject registrations with unsafe metadata, and (2) let the
 * consent screen tell users whether a client's redirect target is one we
 * recognise, warning harder when a name claims a well-known client but its
 * redirects are not that client's.
 *
 * An http loopback redirect is opened on the approving user's own computer, so
 * a remote party who registered the client cannot receive the code. Loopback is
 * still not evidence of which product is listening, so it never makes a client
 * recognised; the consent screen shows a local-application note instead.
 */

type TrustedClient = {
  /** Matched case-insensitively against a normalized client_name. */
  namePattern: RegExp;
  /** Returns true when the redirect URI belongs to this client. Never true for loopback. */
  matchesRedirect: (uri: URL) => boolean;
};

const isLoopback = (uri: URL) => uri.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);

// Redirect URIs checked against vendor docs/reports on 2026-10-06:
// - Claude: https://claude.ai/api/mcp/auth_callback (claude.com may follow); Claude Code uses loopback.
// - Cursor: cursor://anysphere.cursor-mcp/oauth/callback, newer builds use http://localhost,
//   cloud agents use https://www.cursor.com/agents/mcp/oauth/callback (often sent alongside the others).
// - ChatGPT: https://chatgpt.com/connector_platform_oauth_redirect and /connector/oauth/{callback_id}.
// - VS Code: https://vscode.dev/redirect, https://insiders.vscode.dev/redirect, http://127.0.0.1[:port].
const TRUSTED_CLIENTS: TrustedClient[] = [
  {
    namePattern: /claude/,
    matchesRedirect: (u) => u.protocol === "https:" && ["claude.ai", "claude.com"].includes(u.hostname),
  },
  {
    namePattern: /cursor/,
    matchesRedirect: (u) =>
      u.protocol === "cursor:" || (u.protocol === "https:" && ["www.cursor.com", "cursor.com"].includes(u.hostname)),
  },
  {
    namePattern: /chatgpt|openai/,
    matchesRedirect: (u) => u.protocol === "https:" && u.hostname === "chatgpt.com",
  },
  {
    namePattern: /vs ?code|visual studio code/,
    matchesRedirect: (u) => u.protocol === "https:" && ["vscode.dev", "insiders.vscode.dev"].includes(u.hostname),
  },
];

const MAX_NAME_LENGTH = 100;

// Schemes that navigate to a script, a local file, or an embedded document.
// Registration allows other custom schemes (cursor://, vscode://) on purpose.
const DANGEROUS_REDIRECT_PROTOCOLS = new Set(["about:", "blob:", "data:", "file:", "javascript:", "vbscript:"]);

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
 * True when the client's name claims a well-known client AND this redirect belongs to it.
 */
export function isRecognisedRedirect(clientName: string | undefined, redirectUri: string): boolean {
  const trusted = claimedClient(clientName);
  const url = parseRedirect(redirectUri);
  return !!trusted && !!url && trusted.matchesRedirect(url);
}

/**
 * True when the client's name claims a well-known client AND every non-loopback redirect URI
 * belongs to that client. Loopback URIs are ignored because they do not identify the client,
 * so a client with only loopback redirects is not recognised.
 */
export function isRecognisedClient(clientName: string | undefined, redirectUris: string[]): boolean {
  if (!claimedClient(clientName)) return false;
  const remote = redirectUris.filter((r) => !isLoopbackRedirect(r));
  return remote.length > 0 && remote.every((r) => isRecognisedRedirect(clientName, r));
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
  }

  return undefined;
}

/**
 * True when a name claims a well-known client but at least one non-loopback redirect URI is
 * not one we know for it. Registration is allowed (we can't list every legitimate redirect,
 * and rejecting would break real clients), but the consent screen warns harder and we log it.
 * Loopback redirects are ignored: Claude Code, Cursor, and VS Code all register them.
 */
export function claimsUnrecognisedBrand(clientName: string | undefined, redirectUris: string[]): boolean {
  if (!claimedClient(clientName)) return false;
  return redirectUris.some((r) => !isLoopbackRedirect(r)) && !isRecognisedClient(clientName, redirectUris);
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

function hasRawRedirectHazards(uri: string): boolean {
  // Control characters, spaces, and backslashes survive into some URL parsers as a different host.
  for (let i = 0; i < uri.length; i++) {
    const code = uri.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f || uri[i] === "\\") return true;
  }
  return false;
}

function isAcceptableRedirectShape(url: URL): boolean {
  if (url.username || url.password || url.hash) return false;
  if (DANGEROUS_REDIRECT_PROTOCOLS.has(url.protocol)) return false;
  if (url.protocol === "https:") return url.hostname.length > 0;
  if (url.protocol === "http:") return isLoopback(url);
  return /^[a-z0-9][a-z0-9+.-]*:$/.test(url.protocol);
}

/**
 * URL to use when sending the user back to an OAuth client, or null if `requested` is not allowed.
 *
 * The consent transaction is stored in an unsigned cookie, so a redirect URI read back from it
 * has to be checked against the client's registered redirect URIs. The returned URL is built from
 * the registered value. Loopback clients may use a different port than the one they registered
 * (RFC 8252); only that port is taken from the request.
 */
export function resolveRegisteredRedirect(requested: string, registeredUris: readonly string[]): URL | null {
  if (typeof requested !== "string" || hasRawRedirectHazards(requested)) return null;
  const requestedUrl = parseRedirect(requested);
  if (!requestedUrl || !isAcceptableRedirectShape(requestedUrl)) return null;

  const allowedHosts = new Set<string>();
  for (const registered of registeredUris) {
    if (typeof registered !== "string" || hasRawRedirectHazards(registered)) continue;
    const allowlisted = parseRedirect(registered);
    if (!allowlisted || !isAcceptableRedirectShape(allowlisted)) continue;
    if (allowlisted.hostname.length > 0) allowedHosts.add(allowlisted.hostname);

    const loopbackPortOnly =
      requested !== registered &&
      isLoopback(requestedUrl) &&
      isLoopback(allowlisted) &&
      requestedUrl.protocol === allowlisted.protocol &&
      requestedUrl.hostname === allowlisted.hostname &&
      requestedUrl.pathname === allowlisted.pathname &&
      requestedUrl.search === allowlisted.search;
    if (requested !== registered && !loopbackPortOnly) continue;

    const redirect = new URL(allowlisted.href);
    if (loopbackPortOnly) {
      if (requestedUrl.port !== "" && !/^[0-9]+$/.test(requestedUrl.port)) continue;
      redirect.port = requestedUrl.port;
      if (!isLoopback(redirect) || redirect.hostname !== allowlisted.hostname) continue;
    }
    if ((redirect.protocol === "https:" || redirect.protocol === "http:") && !allowedHosts.has(redirect.hostname)) {
      continue;
    }
    if (!isAcceptableRedirectShape(redirect)) continue;
    return redirect;
  }
  return null;
}
