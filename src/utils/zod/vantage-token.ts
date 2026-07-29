import { nonempty } from "./nonempty";
import { TOKEN_KINDS, type TokenKind } from "./token-kinds";

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

/**
 * Vantage resource token: trims, requires a non-empty value,
 * and checks that the value starts with the kind's prefix (e.g. `wrkspc_`).
 */
export function vantageToken(kind: TokenKind, options?: VantageTokenOptions) {
  const { prefix, label } = TOKEN_KINDS[kind];

  return nonempty()
    .check((ctx) => {
      if (ctx.value.length > 0 && !ctx.value.startsWith(`${prefix}_`)) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: `Must be a ${label} token starting with ${prefix}_`,
        });
      }
    })
    .describe(buildDescription(kind, options));
}
