import { nonempty } from "./nonempty";
import { TOKEN_KINDS, type TokenKind } from "./token-kinds";

const KNOWN_TOKEN_PREFIXES = Object.values(TOKEN_KINDS)
  .map(({ prefix }) => `${prefix}_`)
  .sort((left, right) => right.length - left.length);

export type VantageTokenOptions = {
  /** Extra context appended after the token format hint. */
  description?: string;
};

function buildDescription(kind: TokenKind, options?: VantageTokenOptions): string {
  const meta = TOKEN_KINDS[kind];

  return [`${meta.label} token (\`${meta.prefix}_*\`).`, options?.description]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(" ");
}

function hasExpectedPrefix(value: string, expectedPrefix: string): boolean {
  const mostSpecificKnownPrefix = KNOWN_TOKEN_PREFIXES.find((prefix) => value.startsWith(prefix));
  return mostSpecificKnownPrefix === `${expectedPrefix}_`;
}

/**
 * Vantage resource token: trims, requires a non-empty value,
 * and matches the most specific known prefix (e.g. `rprt_frcst_`
 * is a Report Forecast, not a Cost Report).
 */
export function vantageToken(kind: TokenKind, options?: VantageTokenOptions) {
  const { prefix, label } = TOKEN_KINDS[kind];

  return nonempty()
    .check((ctx) => {
      if (ctx.value.length > 0 && !hasExpectedPrefix(ctx.value, prefix)) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: `Must be a ${label} token (${prefix}_*)`,
        });
      }
    })
    .describe(buildDescription(kind, options));
}
