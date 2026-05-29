---
name: writing-mcp-tools
description: Author a new MCP tool for the Vantage MCP server — file layout, nesting/moving existing siblings into resource folders, registerTool template, annotation hints, description style, and tests. Use whenever adding, splitting, refactoring, or relocating a tool under `src/tools/`. For evals, see writing-evals.
---

# Writing MCP tools

Every tool in this repo is a thin wrapper around a Vantage REST endpoint, registered through `registerTool` and tested with `testTool`. The recipe below is what a new tool should look like. Read it before adding files under `src/tools/`.

## Where the file goes

**New tools are nested under a resource directory.** Pick (or create) a directory named after the resource family — e.g. `src/tools/budgets/`, `src/tools/recommendation-views/`. Inside that directory:

```
src/tools/<resource>/
  index.ts                       # one `import "./<verb>-<resource>"` line per tool
  <verb>-<resource>.ts           # tool file (list, get, create, update, delete, …)
  <verb>-<resource>.test.ts      # tests, co-located
  schemas.ts                     # OPTIONAL — shared zod objects used by multiple tools
```

Create `src/tools/<resource>/index.ts` with one `import "./<verb>-<resource>"` line per tool, then run `npm run generate-tools-index`. That regenerates `src/tools/index.ts` to include the new directory — do not edit `src/tools/index.ts` by hand.

> Many existing tools (e.g. `src/tools/create-cost-alert.ts`, `src/tools/list-costs.ts`) still live at the top level. **Don't add new top-level tools.** When you add or change a tool in a resource family, move any top-level siblings into that folder in the same PR (see below). Do not move unrelated top-level tools.

### Moving existing siblings into the resource folder

If you are adding a tool under `src/tools/<resource>/` and other tools for the same resource still live at `src/tools/<verb>-<resource>.ts` (or share the same resource noun in the filename, e.g. `list-cost-reports`, `get-cost-report`, `create-cost-report`), **move them all into `src/tools/<resource>/` in the same change** — not only the new file.

1. **Identify the family** — same REST resource or shared noun (`cost-report`, `budget`, `recommendation-view`, …). Move every matching `*.ts` and `*.test.ts` from `src/tools/` into `src/tools/<resource>/`.
2. **Fix imports** in every moved file — top-level paths become one level up:
   - `from "./structure/…"` → `from "../structure/…"`
   - `from "./utils/…"` → `from "../utils/…"`
   - Tool imports stay sibling-relative: `import tool from "./list-cost-reports"`.
3. **Update `src/tools/<resource>/index.ts`** — one `import "./<verb>-<resource>"` line per tool in the family (sorted is fine; the generator sorts the top-level index).
4. **Regenerate the tools index** — `npm run generate-tools-index`. The top-level `src/tools/index.ts` should import `./<resource>` once, not each tool file. Remove any stale per-tool imports left over from before the move.
5. **Verify** — `npm run type-check` and `npm test -- --run src/tools/<resource>/`.

Reference layout after a move: `src/tools/cost-reports/` (`create-`, `list-`, `get-`, `update-`, `delete-`, `get-*-forecast`, each with a co-located test).

Do **not** move top-level tools that belong to a different resource, even if the filename looks similar. Scope the move to one resource family per PR unless the user explicitly asks for a broader migration.

## Tool anatomy

Every tool exports a `registerTool` call as the default export. The minimum surface:

```ts
import z from "zod/v4";
import MCPUserError from "../structure/MCPUserError";
import registerTool from "../structure/registerTool";

const description = `
One or two sentences. What this returns and when to reach for it.
`.trim();

export default registerTool({
  name: "list-widgets",            // kebab-case, matches filename
  title: "List Widgets",            // Title Case, shown in UIs
  description,
  annotations: {
    readOnly: true,
    destructive: false,
    openWorld: false,
  },
  args: {
    // zod schema — see "Args / zod" below
  },
  async execute(args, ctx) {
    const response = await ctx.callVantageApi("/v2/widgets", args, "GET");
    if (!response.ok) {
      throw new MCPUserError({ errors: response.errors });
    }
    return response.data;
  },
});
```

Reference implementations to copy from:
- list: `src/tools/budgets/list-budgets.ts`
- get: `src/tools/budgets/get-budget.ts`
- create: `src/tools/budgets/create-budget.ts`
- update: `src/tools/budgets/update-budget.ts`
- delete: `src/tools/delete-folder.ts` (see "Delete tools" below)

## Discovering the API surface

Before writing args or guessing at response fields, read the generated TypeScript client at `@vantage-sh/vantage-client` (`node_modules/@vantage-sh/vantage-client/dist/index.d.ts`). It is the source of truth for:

- the set of endpoint paths `ctx.callVantageApi` accepts as the first argument,
- the request body / query param shape for each `(path, method)` pair, and
- the response body shape you get back on `response.ok`.

Use it to drive the zod schema rather than guessing field names from API docs or other tools. The two helpers worth knowing:

```ts
import type { RequestBodyForPathAndMethod, ResponseBodyForPathAndMethod } from "@vantage-sh/vantage-client";

type CreateWidgetRequest = RequestBodyForPathAndMethod<"/v2/widgets", "POST">;
type CreateWidgetResponse = ResponseBodyForPathAndMethod<"/v2/widgets", "POST">;
```

Cast `args` to the request type at the `callVantageApi` call site if the zod-inferred type doesn't line up exactly (see `create-recommendation-view.ts` for the pattern). If a field exists in the client types but you don't expose it in your zod schema, that's a deliberate choice — leave a one-line note in code if the omission isn't obvious.

## Annotations

The three hints are sent to clients as `readOnlyHint`, `destructiveHint`, and `openWorldHint`. Set them per the MCP spec — not "whatever similar tools happen to have." Some existing tools drift from this; new tools should be correct.

| Verb       | `readOnly` | `destructive` | `openWorld` |
| ---------- | ---------- | ------------- | ----------- |
| `list-*`   | `true`     | `false`       | `false`     |
| `get-*`    | `true`     | `false`       | `false`     |
| `create-*` | `false`    | **`false`**   | `false`     |
| `update-*` | `false`    | `true`        | `false`     |
| `delete-*` | `false`    | `true`        | `false`     |

Why `create-*` is **not** destructive: per the spec, `destructiveHint` means "may perform destructive updates." Creating a new entity is additive — calling it again creates another row, it doesn't overwrite anything. Reserve `destructive: true` for tools that modify or remove existing state.

Why `openWorld: false`: Vantage tools only interact with the Vantage API — a bounded, known surface. `openWorld: true` is for tools that hit the broader internet (web search, arbitrary HTTP fetches). None of our tools should set this to `true`.

If you find yourself wanting to flag a non-obvious case (e.g. a `cancel-*` action, a bulk operation), pick hints by asking: "does this modify or remove existing state?" → `destructive`. "Does it touch unknown external systems?" → `openWorld`.

## Description style

**Goal: minimum prose, strong schema.** The description should be just enough for an LLM to know when to call the tool. Everything about *what to pass* belongs in `.describe()` strings on the zod fields, not in the description.

Keep:
- One or two sentences on what the tool returns / what it's for.
- Disambiguation against neighbouring tools when names are confusable (see `create-cost-alert.ts` calling out Report Notifications).
- Non-obvious context the model can't infer — e.g. that a token can be turned into a console URL (`https://console.vantage.sh/go/<token>`), VQL syntax rules for `query-costs`, pagination conventions.

Cut:
- Restating each argument — that's what `.describe()` is for.
- Describing the response shape — the model sees the result.
- Long onboarding paragraphs ("This tool is useful when…"). If the trigger condition needs explaining, one sentence is the cap.

We measure description quality with **evals** — see `.agents/skills/writing-evals/SKILL.md`. A description is "good" when an eval can drive correct tool selection and correct argument shape from minimal prose. If an eval is failing, fix the description or the zod schema before reaching for more prose — and reach for the schema first.

## Args / zod

Zod is doing most of the work. Make each field carry its weight:

```ts
args: {
  page: z.number().int().min(1).optional().default(1).describe("Page number, defaults to 1"),
  workspace_token: z.string().min(1).describe("Workspace token. Use get-myself to discover."),
  start_date: dateValidator("Start date, YYYY-MM-DD").optional(),
}
```

Patterns to use:
- `dateValidator("…")` from `../utils/dateValidator` for any `YYYY-MM-DD` field.
- `DEFAULT_LIMIT` from `../structure/constants` when paginating.
- `paginationData(response.data)` from `../utils/paginationData` to compute `{ hasNextPage, nextPage }` for list tools.
- `pathEncode` from `@vantage-sh/vantage-client` for any token interpolated into a URL path.
- Request body types: `RequestBodyForPathAndMethod<"/v2/…", "POST">` from `@vantage-sh/vantage-client` when you need to assert the body shape (see `create-recommendation-view.ts`).
- Shared sub-schemas (e.g. `budgetPeriod` in `src/tools/budgets/schemas.ts`) go in a `schemas.ts` sibling.

In `.describe()` strings: name the thing, give the format, and point at the tool that can discover valid values ("Use list-cost-providers to discover valid provider names"). Don't restate types — `z.number()` already says it's a number.

## Execute

`execute(args, ctx)` is async and uses `ctx.callVantageApi(path, params, method)`. Always check `response.ok` and throw `MCPUserError` on failure:

```ts
if (!response.ok) {
  throw new MCPUserError({ errors: response.errors });
}
return response.data;
```

Don't catch errors yourself unless you're adding context — `registerTool` already turns `MCPUserError` into a structured tool error response.

### List tools — pagination shape

```ts
return {
  widgets: response.data.widgets,
  pagination: paginationData(response.data),
};
```

### Delete tools — return shape

Return `{ token: args.<resource>_token }`. This confirms what was deleted without leaking extra fields. `src/shared.ts` handles HTTP 204 by returning `{ data: undefined, ok: true }`, so do **not** rely on `response.data` in a delete. See `src/tools/delete-folder.ts`.

### Cross-field validation

Validate combinations *inside* `execute` and throw `MCPUserError` — keep the zod schema field-local. Example from `create-recommendation-view.ts`:

```ts
if (!!args.tag_key !== !!args.tag_value) {
  throw new MCPUserError({
    errors: [{ message: "tag_key and tag_value must both be provided together" }],
  });
}
```

## Tests

Co-locate `<tool>.test.ts` next to the tool. Use the `testTool` helper from `../utils/testing`. The shape:

```ts
import { expect } from "vitest";
import {
  type ExecutionTestTableItem,
  type ExtractOutputSchema,
  type ExtractValidators,
  type InferValidators,
  requestsInOrder,
  type SchemaTestTableItem,
  testTool,
} from "../utils/testing";
import tool from "./list-widgets";

type Validators = ExtractValidators<typeof tool>;
type OutputSchema = ExtractOutputSchema<typeof tool>;

const validArguments: InferValidators<Validators> = { /* … */ };

const argumentSchemaTests: SchemaTestTableItem<Validators>[] = [
  { name: "valid input", data: validArguments },
  // poisoned-input cases use `poisonOneValue` + `dateValidatorPoisoner`
];

const executionTests: ExecutionTestTableItem<Validators, OutputSchema>[] = [
  {
    name: "successful call",
    apiCallHandler: requestsInOrder([
      { endpoint: "/v2/widgets", params: {/* … */}, method: "GET", result: { ok: true, data: {/* … */} } },
    ]),
    handler: async ({ callExpectingSuccess }) => {
      const res = await callExpectingSuccess(validArguments);
      expect(res).toEqual(/* … */);
    },
  },
  {
    name: "unsuccessful call",
    apiCallHandler: requestsInOrder([
      { endpoint: "/v2/widgets", params: {/* … */}, method: "GET", result: { ok: false, errors: [{ message: "…" }] } },
    ]),
    handler: async ({ callExpectingMCPUserError }) => {
      const err = await callExpectingMCPUserError(validArguments);
      expect(err.exception).toEqual({ errors: [{ message: "…" }] });
    },
  },
];

testTool(tool, argumentSchemaTests, executionTests);
```

`testTool` automatically verifies the tool registers with the right name/title/description/annotations, so you don't write that test by hand. Reference: `src/tools/budgets/list-budgets.test.ts`.

Always include:
- At least one schema test with valid input.
- A schema test per non-trivial constraint (required field missing, bad enum value, poisoned date via `dateValidatorPoisoner`).
- A successful-execution test that asserts both the request params (via `requestsInOrder`) and the returned shape.
- An unsuccessful-execution test that asserts the `MCPUserError` exception shape.

## Evals

Every new tool needs an eval file under `evals/`. Evals verify that the description and zod schema are enough for a model to select and call the tool from natural language — they are not optional for new tools.

See **`.agents/skills/writing-evals/SKILL.md`** for the full guide: file template, prompt matrix, distractors, failure diagnosis, and `evalite.db` workflow.

## Checklist before opening a PR

- [ ] Tool file lives under `src/tools/<resource>/`, not at the top level.
- [ ] Any other top-level tools for the same resource were moved into `src/tools/<resource>/` with imports updated (see "Moving existing siblings").
- [ ] `src/tools/<resource>/index.ts` imports every tool in the family.
- [ ] `npm run generate-tools-index` has been run and `src/tools/index.ts` imports only `./<resource>` (no stale per-tool imports for that family).
- [ ] `annotations` follow the table above (especially: `create-*` is `destructive: false`).
- [ ] Description is one or two sentences plus only the non-obvious context the model needs.
- [ ] Every zod field has a `.describe(...)` and uses the right helper (`dateValidator`, `pathEncode`, `DEFAULT_LIMIT`, `paginationData`, `MCPUserError`).
- [ ] Delete tools return `{ token: args.<resource>_token }`.
- [ ] Tests cover schema validation (valid + poisoned), success, and failure.
- [ ] Eval checklist in `.agents/skills/writing-evals/SKILL.md` is complete.
- [ ] `npm run type-check` and `npm test -- --run` are green.
