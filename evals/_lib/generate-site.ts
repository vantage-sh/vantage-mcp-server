import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EvaluateResult, OutputFile } from "promptfoo";
import { parseToolSelectionOutput } from "./assertToolCalls";
import { MERGED_RESULTS_PATH, mergeStoredResults, SITE_DIR, writeOutputFile } from "./resultsStore";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function resultTool(result: EvaluateResult): string {
  return String(result.testCase.metadata?.tool ?? result.vars?.target ?? "unknown");
}

function resultPhrasing(result: EvaluateResult): string {
  return String(result.testCase.metadata?.phrasing ?? "");
}

function cellText(result: EvaluateResult): string {
  const output = parseToolSelectionOutput(result.response?.output);
  if (output.toolCalls.length === 0) {
    return result.error || output.text || "(no tool call)";
  }
  return output.toolCalls.map((call) => `${call.toolName}(${JSON.stringify(call.input ?? {})})`).join(" · ");
}

function renderReport(output: OutputFile): string {
  const results = output.results.results ?? [];
  const stats = output.results.stats;
  const total = stats.successes + stats.failures + stats.errors;
  const passRate = total === 0 ? 0 : (stats.successes / total) * 100;
  const tools = [...new Set(results.map(resultTool))].sort();
  const providers = [...new Set(results.map((result) => result.provider.label ?? result.provider.id ?? "unknown"))];
  const rows = new Map<
    string,
    { prompt: string; tool: string; phrasing: string; cells: Map<string, EvaluateResult> }
  >();

  for (const result of results) {
    const prompt = String(result.vars?.prompt ?? result.description ?? "");
    const tool = resultTool(result);
    const phrasing = resultPhrasing(result);
    const key = `${tool}::${phrasing}::${prompt}`;
    const row = rows.get(key) ?? { prompt, tool, phrasing, cells: new Map() };
    row.cells.set(result.provider.label ?? result.provider.id ?? "unknown", result);
    rows.set(key, row);
  }

  const tableRows = [...rows.values()]
    .sort(
      (a, b) => a.tool.localeCompare(b.tool) || a.phrasing.localeCompare(b.phrasing) || a.prompt.localeCompare(b.prompt)
    )
    .map((row) => {
      const cells = providers
        .map((provider) => {
          const result = row.cells.get(provider);
          if (!result) {
            return '<td class="empty"></td>';
          }
          const status = result.success ? "pass" : result.error ? "error" : "fail";
          const reason = result.gradingResult?.reason ?? result.error ?? "";
          return `<td class="${status}" title="${escapeHtml(reason)}"><span class="status">${status}</span><pre>${escapeHtml(cellText(result))}</pre></td>`;
        })
        .join("");
      return `<tr data-tool="${escapeHtml(row.tool)}"><td>${escapeHtml(row.tool)}</td><td>${escapeHtml(row.phrasing)}</td><td>${escapeHtml(row.prompt)}</td>${cells}</tr>`;
    })
    .join("\n");

  const filters = tools
    .map((tool) => `<button type="button" data-tool="${escapeHtml(tool)}">${escapeHtml(tool)}</button>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vantage MCP tool-selection evals</title>
  <style>
    :root { color-scheme: light; --bg: #f6f4ef; --ink: #1b1b18; --muted: #5c5a55; --line: #d9d4c8; --pass: #1f7a4d; --fail: #b42318; --error: #9a6700; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--ink); }
    header, main { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
    h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
    .meta { color: var(--muted); margin-bottom: 1rem; }
    .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .stat { background: white; border: 1px solid var(--line); border-radius: 8px; padding: 0.75rem 1rem; min-width: 7rem; }
    .stat strong { display: block; font-size: 1.3rem; }
    .filters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .filters button { border: 1px solid var(--line); background: white; border-radius: 999px; padding: 0.3rem 0.75rem; cursor: pointer; }
    .filters button.active, .filters button:hover { background: var(--ink); color: white; }
    table { width: 100%; border-collapse: collapse; background: white; font-size: 0.85rem; }
    th, td { border: 1px solid var(--line); padding: 0.5rem; vertical-align: top; text-align: left; }
    th { background: #efece4; position: sticky; top: 0; }
    td.pass { background: #e8f6ee; }
    td.fail { background: #fdecea; }
    td.error { background: #fff6d9; }
    .status { font-weight: 700; text-transform: uppercase; font-size: 0.7rem; }
    td.pass .status { color: var(--pass); }
    td.fail .status { color: var(--fail); }
    td.error .status { color: var(--error); }
    pre { margin: 0.35rem 0 0; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, monospace; }
  </style>
</head>
<body>
  <header>
    <h1>Vantage MCP tool-selection evals</h1>
    <p class="meta">Generated ${escapeHtml(output.results.timestamp)}. JSON under <code>evals/results/&lt;model&gt;/&lt;resource&gt;/&lt;tool&gt;.json</code> is the source of truth.</p>
    <div class="stats">
      <div class="stat"><strong>${passRate.toFixed(1)}%</strong>pass rate</div>
      <div class="stat"><strong>${stats.successes}</strong>passed</div>
      <div class="stat"><strong>${stats.failures}</strong>failed</div>
      <div class="stat"><strong>${stats.errors}</strong>errors</div>
      <div class="stat"><strong>${tools.length}</strong>tools</div>
    </div>
    <div class="filters">
      <button type="button" class="active" data-tool="">all tools</button>
      ${filters}
    </div>
  </header>
  <main>
    <table>
      <thead>
        <tr>
          <th>Tool</th>
          <th>Phrasing</th>
          <th>Prompt</th>
          ${providers.map((provider) => `<th>${escapeHtml(provider)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="${providers.length + 3}">No stored results yet. Run <code>npm run eval</code>.</td></tr>`}
      </tbody>
    </table>
  </main>
  <script>
    const buttons = document.querySelectorAll(".filters button");
    const rows = document.querySelectorAll("tbody tr[data-tool]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const tool = button.dataset.tool;
        rows.forEach((row) => {
          row.style.display = !tool || row.dataset.tool === tool ? "" : "none";
        });
      });
    });
  </script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const merged = await mergeStoredResults();
  await writeOutputFile(MERGED_RESULTS_PATH, merged);
  await mkdir(SITE_DIR, { recursive: true });
  const html = renderReport(merged);
  await writeFile(join(SITE_DIR, "report.html"), html, "utf8");
  await writeFile(join(SITE_DIR, "index.html"), html, "utf8");
  const total = merged.results.stats.successes + merged.results.stats.failures + merged.results.stats.errors;
  console.log(`Merged ${total} result(s) → ${MERGED_RESULTS_PATH}`);
  console.log(`Wrote ${join(SITE_DIR, "index.html")} and report.html`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
