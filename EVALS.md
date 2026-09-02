# Tool-selection evals

Unit tests prove a tool is wired correctly. Evals prove the **description and argument schema** are
good enough that a model can find and call the tool from a natural-language prompt.

This page is the approach and the day-to-day workflow. Conventions for writing a new case file
live in [`.agents/skills/writing-evals/SKILL.md`](.agents/skills/writing-evals/SKILL.md).

## Approach

Every tool is scored the same way: give the model a prompt, see which tool it calls, and check that
it picked the right one with the right arguments. We do **not** execute the Vantage API.
The tool's `execute` function is a no-op — selection is the only thing under test.

Every prompt loads the target plus four distractors. Testing the target in isolation does not tell us
whether its description is distinct enough for a real MCP session, where the model has a large tool list.

Distractors are sampled reproducibly from every other registered tool. A case can name
high-signal sibling tools explicitly; those are kept and any remaining slots are sampled automatically.

Each tool has exactly two prompts:

- **Direct** — the user names the exact registered tool identifier.
- **Inferred** — the user names a goal ("I need my default workspace token before I query costs").

That produces two cells per tool and model. To compare models, we replay the same cases with a different
`--model` — we do not expand the suite into an always-on grid of every model.

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
(tool × phrasing × prompt, with a column per model). Filter by tool in the page header.

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

That command runs only that tool's direct and inferred cases, each with four distractors, and writes:

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
