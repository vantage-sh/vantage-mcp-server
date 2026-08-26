# Tool-selection evals

Unit tests prove a tool is wired correctly. Evals prove the **description and argument schema** are
good enough that a model can find and call the tool from a natural-language prompt.

This page is the approach and the day-to-day workflow. Conventions for writing a new case file
live in [`.agents/skills/writing-evals/SKILL.md`](.agents/skills/writing-evals/SKILL.md).

## Approach

Every tool is scored the same way: give the model a prompt, see which tool it calls, and check that
it picked the right one with the right arguments. We do **not** execute the Vantage API.
The tool's `execute` function is a no-op — selection is the only thing under test.

Each tool has two loading modes, replayed across as many models as we care about:

| Mode               | What the model sees              | What it tests                                                                   |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| **1:1 (isolated)** | Only the target tool             | Can the model pick this tool when nothing else is competing?                    |
| **1:5 (mixed)**    | The target plus four distractors | Is the description distinct enough that four other tools do not steal the call? |

The isolated run is the baseline. The mixed run is closer to a real MCP session, where
the model has a large tool list. Failures in isolated usually mean the description or
schema does not name the concept. Failures only in mixed usually mean a neighbor's description
is winning the comparison.

Mixed-mode distractors are sampled reproducibly from every other registered tool. A case can name
high-signal sibling tools explicitly; those are kept and any remaining slots are sampled automatically.

Prompts are written in two styles so the same two modes cover both obvious and realistic wording:

- **Direct** — the user names the concept ("get the current user", "list my budgets").
- **Inferred** — the user names a goal ("I need my default workspace token before I query costs").

A typical tool therefore has a handful of direct prompts and a handful of inferred prompts, each run
in isolated and mixed against one model. That is the cell we store. To compare models, we replay
the same cases with a different `--model` — we do not expand the suite into an always-on grid of every model.

## Why we keep the outcomes

Calling frontier models is slow and expensive. We run a tool against a model **once**, then keep the result.

JSON under `evals/results/<model>/<resource>/<tool>.json` is the durable store. Adding `get-myself`
against `gpt-5.6-sol-high` writes only that file. Every other tool and model stays put. HTML is
generated from those files and is disposable.

That is how we avoid re-running the entire suite: new work is "this tool, this model." Overwriting
is the same command; it replaces that one JSON file.

Eval runs always make fresh model calls. The committed JSON is the retained baseline; promptfoo's local
response cache is disabled so "run this eval" unambiguously means "refresh this result."

## GitHub Pages

CI does **not** call models. On every push to `main` that touches `evals/results/`, GitHub Actions
merges the committed JSON and deploys a static report to Pages:

<https://vantage-sh.github.io/vantage-mcp-server/>

No API keys in CI. If the JSON is in the repo, the report can be rebuilt.

## Layout

```
evals/
  cases/<resource>/<tool>.eval.ts          # prompts + expected tool calls
  results/<model>/<resource>/<tool>.json   # committed outcomes
  site/                                    # generated HTML (not committed)
```

Case folders mirror `src/tools/<resource>/`. Result folders use the `--model` slug, including effort
when you set one (`gpt-5.6-sol-high`).

## View outcomes locally

You need the committed JSON; you do not need model API keys.

```bash
npm run eval:site
open evals/site/index.html
```

`eval:site` merges every file under `evals/results/` into a single table
(tool × phrasing × prompt, with a column per model × loading mode). Filter by tool in the page header.

`npm run eval:view` opens promptfoo's interactive viewer if you want the raw run UI instead of the static report.

The live report is at <https://vantage-sh.github.io/vantage-mcp-server/>.

## Run a new eval

New tools ship with `evals/cases/<resource>/<tool>.eval.ts`.
Copy `evals/cases/current-user/get-myself.eval.ts` and see the
[writing-evals skill](.agents/skills/writing-evals/SKILL.md) for the prompt template.

Set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` in `.env` for the provider you are running. Then:

```bash
npm run eval -- --list-models
npm run eval -- --tool get-myself --model gpt-5.6-sol-high
```

`--model` is required. The slug is an approved model id, optionally plus an effort
suffix (`gpt-5.6-sol-high`). Models that do not expose effort (for example `claude-haiku-4-5`)
take the bare id. Effort is optional even when the model supports it — `gpt-5.6-sol`
uses the provider default.

That command runs only that tool's cases, isolated and mixed, and writes:

`evals/results/gpt-5.6-sol-high/current-user/get-myself.json`

Other result files are left alone. Commit the new JSON. Optionally run `npm run eval:site` to
inspect the report before you push. After merge to `main`, Pages picks up the file automatically.

To score the same tool on another model, run the command again with a different `--model`. Each
slug gets its own folder.

## Overwrite an eval

Re-run the same `--tool` and `--model`. The existing JSON for that pair is replaced.

```bash
npm run eval -- --tool get-myself --model gpt-5.6-sol-high
```

Do this when you change the tool's description or Zod schema, or when you change the prompts
in the case file. You do not need to re-run every model unless you want those baselines refreshed too.

Useful flags:

- `--filter-failing evals/results/<model>/<resource>/<tool>.json` — re-run only the failing cells from a previous file. Still pass `--tool` and `--model`.

The normal `eval` command requires `--tool` and rejects an implicit full-suite run. To deliberately
refresh every case for a model—for example, when establishing a baseline for a newly approved model—run:

```bash
npm run eval:all -- --model gpt-5.6-sol-high
```
