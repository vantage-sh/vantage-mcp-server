import { html, raw } from "hono/html";

/**
 * Renders the consent screen HTML
 */
export function renderConsentScreen({
  clientName,
  // clientLogo, // TODO: Implement logo display
  // clientUri, // TODO: Implement client URI display
  redirectUri,
  redirectHost,
  isRecognisedClient,
  isLoopbackRedirect,
  requestedScopes,
  transactionState,
  consentToken,
  sseMigrationUrl,
}: {
  clientName: string;
  clientLogo: string;
  clientUri: string;
  redirectUri: string;
  redirectHost: string;
  isRecognisedClient: boolean;
  isLoopbackRedirect: boolean;
  requestedScopes: string[];
  transactionState: string;
  consentToken: string;
  sseMigrationUrl?: string;
}) {
  return html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Authorization Request</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <style>
          :root {
            --primary-color: #872ee1;
            --text-color: #333;
            --background-color: #f7f7f7;
            --card-background: #ffffff;
            --border-color: #e0e0e0;
            --danger-color: #ef233c;
            --success-color: #2a9d8f;
            --font-family:
              -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
              Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          }

          body {
            font-family: var(--font-family);
            background-color: var(--background-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }

          .container {
            width: 100%;
            max-width: 480px;
            padding: 20px;
          }

          .card {
            background-color: var(--card-background);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            padding: 32px;
            overflow: hidden;
          }

          .header {
            text-align: center;
            margin-bottom: 24px;
          }

          h1 {
            font-size: 20px;
          }

          .app-link {
            color: var(--primary-color);
            text-decoration: none;
            font-size: 14px;
          }

          .app-link:hover {
            text-decoration: underline;
          }

          .description {
            margin: 24px 0;
            font-size: 16px;
            line-height: 1.5;
          }
          .description:first-of-type {
            margin: 0 0 24px 0;
          }

          .scopes {
            background-color: var(--background-color);
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          }

          .deprecation-notice {
            background-color: #fff8e6;
            border: 1px solid #e5c66a;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            font-size: 14px;
            line-height: 1.5;
          }

          .deprecation-notice p {
            margin: 8px 0 0;
          }

          .deprecation-notice code {
            overflow-wrap: anywhere;
          }

          .scope-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 15px;
          }

          .scope-list {
            font-size: 16px;
            margin: 0;
            padding-left: 20px;
          }

          .actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
          }

          .btn {
            flex: 1;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
          }

          input[type="text"].btn {
            cursor: auto;
            border-radius: 0px;
          }

          .btn-cancel {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
          }

          .btn-cancel:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }

          .btn-approve {
            color: var(--background-color);
            border-radius: 6px;
            border: 0px solid var(--primary-color);
            background: var(--primary-color);
          }

          .btn-approve:hover {
            background: var(--primary-color);
          }

          .security-note {
            margin-top: 24px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }

          @media (max-width: 520px) {
            .container {
              padding: 10px;
            }

            .card {
              padding: 24px;
              border-radius: 8px;
            }
          }

          .app-logo {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 8px;
          }
          .app-logo-mcp {
            width: 24px;
            height: 24px;
            object-fit: contain;
            border-radius: 8px;
            padding: 8px;
          }
          .app-logo.shadow,
          .app-logo-mcp.shadow {
            border-radius: 80px;
            background: var(--background-color, #fff);
            box-shadow: 0px 5px 12px 0px rgba(0, 0, 0, 0.1);
          }
          .img-container {
            display: inline-block;
            margin: 0 8px;
          }
          .mb-8 {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Vantage Hosted MCP Server<br />Authorization Request</h1>
            </div>
            <div class="header">
              <span class="img-container">
                <img
                  src="/vantage-logo.svg"
                  alt="Vantage logo"
                  class="shadow app-logo"
                />
              </span>
              <img src="/line.svg" alt="line" class="app-logo" />
              <span class="img-container">
                <img
                  src="/mcp-logo.png"
                  alt="Model Context Protocol logo"
                  class="shadow app-logo-mcp"
                />
              </span>
            </div>

            <p class="description">
              <strong>${clientName}</strong> is requesting permission to access the
              <strong>Vantage API</strong> using your account. Please review the
              permissions before proceeding.
            </p>

            ${
              isRecognisedClient
                ? ""
                : isLoopbackRedirect
                  ? html`<div class="deprecation-notice" role="note">
                  <strong>Local application</strong>
                  <p>
                    This will send your authorization back to an app running on this
                    computer (<code>${redirectHost}</code>). Only continue if you just
                    started connecting <strong>${clientName}</strong> yourself.
                  </p>
                </div>`
                  : html`<div class="deprecation-notice" role="alert">
                  <strong>Unverified application</strong>
                  <p>
                    Vantage has not verified <strong>${clientName}</strong>. Anyone can
                    choose this name. If you approve, your authorization will be sent to
                    <strong><code>${redirectHost}</code></strong>. Only continue if you
                    started this connection yourself and recognize that address.
                  </p>
                </div>`
            }

            ${
              sseMigrationUrl
                ? html`<div class="deprecation-notice" role="note">
                  <strong>Update your Vantage MCP connection</strong>
                  <p>
                    This client is connecting through the deprecated legacy SSE endpoint.
                    Update your MCP client configuration to use <code>${sseMigrationUrl}</code>
                    with Streamable HTTP. You can continue authorizing this connection during
                    the 60-day migration window. The legacy SSE endpoint will be retired on November 30, 2026.
                  </p>
                </div>`
                : ""
            }

            <p class="description mb-8">
              By clicking "Allow Access", you authorize
              <strong>${clientName}</strong> to access the following resources:
            </p>

            <ul class="scope-list">
              ${raw(
                requestedScopes
                  .map(
                    (scope) => `
              <li>${scope}</li>
              `
                  )
                  .join("\n")
              )}
            </ul>

            <p class="description">
              If you did not initiate the request coming from
              <strong>${clientName}</strong> (<i>${redirectUri}</i>) or you do not
              trust this application, you should deny access.
            </p>

            <form method="POST" action="/authorize/consent">
              <input
                type="hidden"
                name="transaction_state"
                value="${transactionState}"
              />
              <input type="hidden" name="consent_token" value="${consentToken}" />

              <div class="actions">
                <button
                  type="submit"
                  name="consent_action"
                  value="deny"
                  class="btn btn-cancel"
                >
                  Deny Access
                </button>
                <button
                  type="submit"
                  name="consent_action"
                  value="approve"
                  class="btn btn-approve"
                >
                  Allow Access
                </button>
              </div>
            </form>

            <p class="description">
              Users that access Vantage through their SSO provider, please provide
              your email address below:
            </p>

            <form method="POST" action="/authorize/consent">
              <input
                type="hidden"
                name="transaction_state"
                value="${transactionState}"
              />
              <input type="hidden" name="consent_token" value="${consentToken}" />

              <div class="actions">
                <input
                  type="text"
                  name="sso_email"
                  placeholder="SSO Login Email"
                  class="btn btn-cancel"
                  required
                />
                <button
                  type="submit"
                  name="consent_action"
                  value="approve-sso"
                  class="btn btn-approve"
                >
                  Allow SSO
                </button>
              </div>
            </form>

            <p class="security-note">
              You're signing in to a third-party application. Your account
              information is never shared without your permission.
            </p>
          </div>
        </div>
      </body>
    </html>
    `;
}
