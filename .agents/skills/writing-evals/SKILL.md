---
name: writing-evals
description: Write and iterate on tool-selection evals for the Vantage MCP server — promptfoo setup, prompt matrix, distractors, failure diagnosis, and JSON/Pages workflow. Use when adding or updating evals under `evals/` or when an eval run fails after changing a tool description or zod schema.
---

# Writing evals

Unit tests prove a tool wires up and the API call shape is right. **Evals prove the description + zod schema are good enough that a model can find and call the tool from a natural-language prompt.** Tool authoring conventions (description style, zod `.describe()` strings) live in `.agents/skills/writing-mcp-tools/SKILL.md`; this skill covers the eval harness and how to iterate when rows fail.

## Stack and commands

[promptfoo](https://www.promptfoo.dev) + Vercel AI SDK v6 + `@ai-sdk/anthropic` + `@ai-sdk/openai`. The custom provider loads tools from the live `registerTool` registry and asks the model to select one.

| Command | Purpose |
| ------- | ------- |
| `npm run eval -- --tool <name> --model gpt-5.6-sol-high` | Run one tool against one approved model (normal workflow) |
| `npm run eval -- --model gpt-5.6-sol-high` | Run every case against that model |
| `npm run eval -- --list-models` | Print the approved model × effort catalog |
| `npm run eval -- --filter-failing evals/results/<model>/<resource>/<tool>.json --model gpt-5.6-sol-high` | Re-run failures only |
| `npm run eval:site` | Merge stored JSON → `evals/site/index.html` |
| `npm run eval:view` | promptfoo's local viewer |

`--model` is required. The slug is an approved model id, optionally plus an effort suffix (`gpt-5.6-sol-high`). Models that do not expose effort (today: `claude-haiku-4-5`) take the bare id. Effort is optional even when the model supports it — `gpt-5.6-sol` uses the provider default. Dotted forms like `gpt-5.6.sol-high` are accepted and stored as `gpt-5.6-sol-high`. The catalog lives in `evals/_lib/models.ts`.

promptfoo loads `.env`; set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` before the first run. Responses are cached under `evals/.promptfoo/` (gitignored). The provider id includes a hash of every registered tool's description + schema, so editing a tool busts cache for affected cells.

Extra promptfoo flags pass through: `--no-cache`, `--filter-failing <file>`, `--filter-metadata phrasing=direct`.

## Persistence and what to run

JSON under `evals/results/<model>/<resource>/<tool>.json` is the durable store. HTML is disposable.

```
evals/
  cases/<resource>/<tool>.eval.ts             # mirrors src/tools/<resource>/
  results/<model>/<resource>/<tool>.json      # committed per-model slice
  site/                                       # generated report.html → GitHub Pages (not committed)
```

- **Adding a tool:** write `evals/cases/<resource>/<tool>.eval.ts`, then `npm run eval -- --tool <tool> --model gpt-5.6-sol-high`. That writes `evals/results/<model>/<resource>/<tool>.json` for that model and leaves every other tool's files untouched. Run `npm run eval:site` and commit the new JSON.
- **Editing an existing tool:** re-run that tool the same way. The per-tool JSON is replaced.
- **Avoid `npm run eval` with no `--tool`** during normal development — it re-executes every case. Use it only when refreshing the whole baseline for one model.
- **Do not commit** `evals/results/merged.json` or `evals/site/` — both are generated.
- **Merge conflicts** on a JSON file: take one side, re-run that tool, commit the result.
- **Browsing results:** `npm run eval:site && open evals/site/index.html`. GitHub Pages at <https://vantage-sh.github.io/vantage-mcp-server/> regenerates HTML from committed JSON on every push to `main` that touches `evals/results/`. No model API keys in CI.

## Layout

```
evals/
  _lib/
    models.ts             # approved models × effort levels; --model slug parser
    distractors.ts        # 5-tool pool for "mixed" mode + pickTools(target, mode)
    buildAiSdkTools.ts    # reads from the live registerTool registry → AI SDK tool() defs
    runToolSelection.ts   # { prompt, model, toolNames } → { toolCalls, text }
    provider.ts           # promptfoo custom provider (selected model × isolated|mixed)
    assertToolCalls.ts    # flexible tool-call match
    buildCases.ts         # cartesian product of prompts × phrasing
    run-eval.ts           # CLI: promptfoo eval + split into results/<model>/<resource>/<tool>.json
    generate-site.ts      # merge JSON → evals/site/index.html
  cases/<resource>/<tool>.eval.ts
  promptfooconfig.ts
```

Case files live under `evals/cases/<resource>/` so they stay out of Vitest's path and match `src/tools/<resource>/`. Use the `.eval.ts` suffix so they are distinct from the tool file and the unit test. `promptfooconfig.ts` picks up every `**/*.eval.ts` file automatically. The adapter imports `src/tools` once and reads tools out of the live `registerTool` registry — adding a new tool to the codebase makes it available to evals automatically; you just need to write its case file.

## The matrix

Every tool's case file contains **two suites** — one for direct phrasing, one for inferred phrasing — and each suite runs against the **one** `--model` you pass, in both loading modes. That's a 4-quadrant matrix per prompt:

|             | **Isolated** (only the target tool loaded)    | **Mixed** (target + 4 distractors)                      |
| ----------- | --------------------------------------------- | ------------------------------------------------------- |
| **Direct**  | Can the model pick the tool when the user names the concept and nothing competes?       | Same wording, but is the description distinct enough that 4 unrelated neighbours don't pull it astray? |
| **Inferred** | Does the description cover the indirect phrasing well enough to fire at all? | Both pressures combined — the realistic deployment case. |

Each cell is what diagnoses a failure (see "Reading failures" below). Caps out at 16 cells per tool with 4 prompts per suite against one model, which is what `evals/cases/current-user/get-myself.eval.ts` runs. To compare models, run the same `--tool` again with a different `--model`; each slug gets its own JSON under `evals/results/<model>/`.

## File template

`evals/cases/current-user/get-myself.eval.ts` is the canonical reference. The shape per tool:

```ts
import { buildToolCases } from "../../_lib/buildCases";

const TARGET = "<tool-name>";

export default function generateTests() {
  return buildToolCases({
    target: TARGET,
    resource: "<resource>",
    directPrompts: [
      { input: "<prompt naming the concept directly>", expected: [{ toolName: TARGET, input: {/* expected args */} }] },
      // 3–6 entries
    ],
    inferredPrompts: [
      { input: "<prompt where intent has to be inferred>", expected: [{ toolName: TARGET, input: {/* expected args */} }] },
      // 3–6 entries
    ],
  });
}
```

`buildToolCases` tags every case with `metadata.tool` and `metadata.resource` so `--tool` / `--filter-metadata tool=` works and results land under `evals/results/<model>/<resource>/`. Loading mode is a provider variant (`gpt-5.6-sol-high · isolated`, `gpt-5.6-sol-high · mixed`, …), not a test-case dimension.

The scorer is **flexible** — order doesn't matter, only that the right tool was called with the right args. Extra tool calls do not fail the cell.

## Writing prompts

- **Direct prompts** name the concept the tool covers — "list my budgets", "show recommendation views", "delete cost report crt_xyz". They test that the description's first sentence carries the load.
- **Inferred prompts** describe the user's *goal*, not the tool — "I want to make sure we don't blow past $50k this quarter" → `create-budget`. They test description coverage and any disambiguating context.
- Write prompts a Vantage MCP user would *actually* send. Generic phrasings with no product context (e.g. `"Who am I?"`) put unfair pressure on the description — models may read them as general knowledge questions, not Vantage account queries. Drop or rephrase prompts like that rather than padding the tool description to catch them.
- 3–6 prompts per suite is plenty. More cells = more API spend on every model rev, not more signal.

## Distractors

`_lib/distractors.ts` defines a fixed 5-tool pool — `pickTools(target, "mixed")` returns the target + 4 others (the target is filtered out of the pool first, so you always get exactly 4 distractors). The defaults are deliberately broad — they catch "is the description distinct from completely unrelated tools," not "is the description distinct from a sibling tool." If your tool has close neighbours (e.g. `list-budgets` vs. `list-folders` vs. `list-cost-reports`), the default pool won't apply enough pressure. Two options:

1. Pick siblings as the "distractors" inline in the eval — call `runToolSelection` with `toolNames: [TARGET, "list-folders", "list-cost-reports", ...]` instead of going through `pickTools`.
2. Add a tool-specific distractor list inside the eval file and use it for the "mixed" mode.

Either way, document the choice in a comment at the top of the case file so the next person knows what the mixed mode is actually testing.

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

- [ ] `evals/cases/<resource>/<tool>.eval.ts` exists with both `direct` and `inferred` suites.
- [ ] 3–6 prompts per suite; each prompt is something a Vantage MCP user would actually send.
- [ ] Mixed-mode distractors documented if the default pool is too weak for sibling tools.
- [ ] `npm run eval -- --tool <tool> --model gpt-5.6-sol-high` is green.
- [ ] New `evals/results/<model>/<resource>/<tool>.json` files are staged (commit as baseline).
- [ ] `npm run eval:site` has been run locally if you want to inspect the report before push.
