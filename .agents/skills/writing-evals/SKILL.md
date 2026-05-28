---
name: writing-evals
description: Write and iterate on tool-selection evals for the Vantage MCP server — evalite setup, prompt matrix, distractors, failure diagnosis, and db workflow. Use when adding or updating evals under `evals/` or when an eval run fails after changing a tool description or zod schema.
---

# Writing evals

Unit tests prove a tool wires up and the API call shape is right. **Evals prove the description + zod schema are good enough that a model can find and call the tool from a natural-language prompt.** Tool authoring conventions (description style, zod `.describe()` strings) live in `.agents/skills/writing-mcp-tools/SKILL.md`; this skill covers the eval harness and how to iterate when rows fail.

## Stack and commands

[evalite v1](https://v1.evalite.dev) + Vercel AI SDK v6 + `@ai-sdk/anthropic` + `@ai-sdk/openai`.

| Command | Purpose |
| ------- | ------- |
| `npm run eval -- ./evals/<path>.eval.ts` | Run one eval file (normal workflow) |
| `npm run eval` | Run every eval file — only when refreshing the whole baseline |
| `npm run eval:dev` | Watch mode + UI on `localhost:3006` |
| `npm run eval:export` | Static HTML from current `evalite.db` (no re-execution) |

Evalite auto-loads `.env`; set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` before the first run. Model outputs are cached by default, so iterating on a description only repays LLM cost for changed cells.

`evalite.config.ts` sets `forceRerunTriggers: ["src/tools/**/*.ts", "evals/_lib/**/*.ts"]` — editing a tool or shared eval lib invalidates cache for affected runs. That is intentional when using `eval:dev`.

## Persistence and what to run

Results are stored in `evals/evalite.db` (SQLite, committed to the repo as a shared baseline). The workflow is **explicit, not automatic** — evalite does not detect which tools have changed and re-run their evals for you. Every cell carries a `created_at` timestamp; treat it as the audit trail for "when did this eval last run vs. when did the tool last change."

- **Adding a tool:** run only the new eval file: `npm run eval -- ./evals/<...>/<your-tool>.eval.ts`. Existing tools' rows stay untouched. Commit the updated `evalite.db` alongside the tool change.
- **Editing an existing tool:** re-run that tool's eval file the same way. The new rows append; older rows remain for history.
- **Avoid `npm run eval` with no path** during normal development — it re-executes every eval file and appends a fresh row set for each. Use it only when intentionally refreshing the whole baseline.
- **WAL sidecars** (`evalite.db-wal`, `-shm`, `-journal`) are ignored in `.gitignore`. Only the `.db` file is tracked. Don't try to commit the sidecars — they're per-process state and will corrupt the db for the next reader.
- **Merge conflicts** on the `.db` are binary and can't be auto-resolved. If two branches both updated it, the simplest fix is to take one side, re-run the affected eval files on the merged branch, and commit the result.
- **Browsing results:** a live UI of the committed db is published to GitHub Pages at <https://vantage-sh.github.io/vantage-mcp-server/> on every push to `main` that touches `evals/evalite.db`. Locally, `npm run eval:export` produces the same static bundle under `./evalite-export/` without re-executing anything.

## Layout

```
evals/
  _lib/
    models.ts             # haiku 4.5, sonnet 4.6, gpt-5-mini, gpt-5 (wrapped with wrapAISDKModel)
    distractors.ts        # 5-tool pool for "mixed" mode + pickTools(target, mode)
    variants.ts           # cartesian product of {model} × {isolated, mixed} = 8 variants
    buildAiSdkTools.ts    # reads from the live registerTool registry → AI SDK tool() defs
    runToolSelection.ts   # { prompt, model, toolNames } → { toolCalls, text }
  <tool-name>.eval.ts                   # for top-level tools
  <resource>/<tool>.eval.ts             # for nested tools
evalite.config.ts
```

Top-level `evals/` keeps `*.eval.ts` out of Vitest's path. The adapter imports `src/tools` once and reads tools out of the live `registerTool` registry — adding a new tool to the codebase makes it available to evals automatically; you just need to write its eval file.

## The matrix

Every tool's eval file contains **two suites** — one for direct phrasing, one for inferred phrasing — and each suite runs against **8 variants** (4 models × 2 loading modes). That's a 4-quadrant matrix per prompt:

|             | **Isolated** (only the target tool loaded)    | **Mixed** (target + 4 distractors)                      |
| ----------- | --------------------------------------------- | ------------------------------------------------------- |
| **Direct**  | Can the model pick the tool when the user names the concept and nothing competes?       | Same wording, but is the description distinct enough that 4 unrelated neighbours don't pull it astray? |
| **Inferred** | Does the description cover the indirect phrasing well enough to fire at all? | Both pressures combined — the realistic deployment case. |

Each cell is what diagnoses a failure (see "Reading failures" below). Caps out at 64 cells per tool with 4 prompts per suite, which is what `evals/get-myself.eval.ts` runs in ~10s on a warm cache.

## File template

`evals/get-myself.eval.ts` is the canonical reference. The shape per tool:

```ts
import { evalite } from "evalite";
import { toolCallAccuracy } from "evalite/scorers";
import { pickTools } from "./_lib/distractors";
import { runToolSelection } from "./_lib/runToolSelection";
import { TOOL_EVAL_VARIANTS } from "./_lib/variants";

const TARGET = "<tool-name>";

const directPrompts = [
  { input: "<prompt naming the concept directly>", expected: [{ toolName: TARGET, input: {/* expected args */} }] },
  // 3–6 entries
];

const inferredPrompts = [
  { input: "<prompt where intent has to be inferred>", expected: [{ toolName: TARGET, input: {/* expected args */} }] },
  // 3–6 entries
];

evalite.each(TOOL_EVAL_VARIANTS)(`${TARGET} · direct phrasing`, {
  data: () => directPrompts,
  task: (prompt, variant) =>
    runToolSelection({
      prompt,
      model: variant.model,
      toolNames: pickTools(TARGET, variant.mode),
    }),
  scorers: [
    ({ output, expected }) =>
      toolCallAccuracy({
        actualCalls: output.toolCalls,
        expectedCalls: expected ?? [],
        mode: "flexible",
      }),
  ],
});

// repeat with inferredPrompts and "inferred phrasing" suite name
```

Use `toolCallAccuracy` in **`flexible` mode** for selection — order doesn't matter, only that the right tool was called with the right args. Reserve `exact` mode for multi-step workflow evals where call sequence matters.

## Writing prompts

- **Direct prompts** name the concept the tool covers — "list my budgets", "show recommendation views", "delete cost report crt_xyz". They test that the description's first sentence carries the load.
- **Inferred prompts** describe the user's *goal*, not the tool — "I want to make sure we don't blow past $50k this quarter" → `create-budget`. They test description coverage and any disambiguating context.
- Write prompts a Vantage MCP user would *actually* send. Generic phrasings with no product context (e.g. `"Who am I?"`) put unfair pressure on the description — models may read them as general knowledge questions, not Vantage account queries. Drop or rephrase prompts like that rather than padding the tool description to catch them.
- 3–6 prompts per suite is plenty. More cells = more API spend on every model rev, not more signal.

## Distractors

`_lib/distractors.ts` defines a fixed 5-tool pool — `pickTools(target, "mixed")` returns the target + 4 others (the target is filtered out of the pool first, so you always get exactly 4 distractors). The defaults are deliberately broad — they catch "is the description distinct from completely unrelated tools," not "is the description distinct from a sibling tool." If your tool has close neighbours (e.g. `list-budgets` vs. `list-folders` vs. `list-cost-reports`), the default pool won't apply enough pressure. Two options:

1. Pick siblings as the "distractors" inline in the eval — call `runToolSelection` with `toolNames: [TARGET, "list-folders", "list-cost-reports", ...]` instead of going through `pickTools`.
2. Add a tool-specific distractor list inside the eval file and use it for the "mixed" mode.

Either way, document the choice in a comment at the top of the eval file so the next person knows what the mixed mode is actually testing.

## Reading failures

The matrix tells you *what to fix*:

| Failure pattern                              | Most likely cause                                                            | Fix                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Direct + isolated** fails                  | First sentence of description doesn't name the concept, or zod arg name buries it. | Edit description; rename/re-describe the arg.                                        |
| **Direct + mixed** fails but isolated passes | A distractor's description is winning the comparison.                        | Add a one-line "Do not use for X" to either tool — usually the *distractor*. (See `create-cost-alert.ts` for the pattern.) |
| **Inferred + isolated** fails                | Description doesn't cover the indirect phrasing. The arg names alone weren't a hint. | Add one sentence connecting the goal to the tool (cap: one sentence).                 |
| **Inferred + mixed** fails but isolated passes | Description covers the concept but a sibling tool covers it too well.       | Disambiguate (same pattern as the second row).                                       |
| Only the smallest model fails one prompt     | Often a prompt-fairness issue, not a description issue.                       | Drop or rephrase the prompt. Don't grow the description to win a single weak-model row. |
| Wrong args (right tool)                      | A zod field is missing a useful `.describe()`, or a required field looks optional. | Tighten `.describe()` strings; add `.default()` if the value is genuinely defaultable. |

**Iteration order when an eval fails:**

1. **Zod schema first** — better `.describe()` on the args, tighter constraints (`min(1)`, `enum(...)`), or a `default(...)` where the model shouldn't have to guess.
2. **Tool description second** — add one sentence if needed; do not write paragraphs to win a single failure.
3. **Prompt third** — if the prompt isn't realistic, fix the prompt rather than the description.
4. **Accept the floor** — if only the smallest model fails on a fair prompt after the above, that's a model floor, not a tool bug.

The rule is: **don't write to the eval.** The eval validates the description and schema; making the description longer just to game one row defeats the point. If you're tempted, double-check the prompt is one a user would actually send.

## Checklist

- [ ] `evals/<...>/<tool>.eval.ts` exists with both `direct` and `inferred` suites.
- [ ] 3–6 prompts per suite; each prompt is something a Vantage MCP user would actually send.
- [ ] Mixed-mode distractors documented if the default pool is too weak for sibling tools.
- [ ] `npm run eval -- ./evals/<...>/<tool>.eval.ts` is green.
- [ ] `evals/evalite.db` is staged alongside the tool change (new rows appended; commit as baseline).
