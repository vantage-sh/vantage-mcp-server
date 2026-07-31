import z from "zod";

/**
 * Non-empty string that trims whitespace before validating length.
 * Prefer this over `z.string().min(1)` for free-text args.
 */
export function nonempty(length = 1, message?: string) {
  return z
    .string()
    .trim()
    .min(length, message !== undefined ? { error: message } : undefined);
}
