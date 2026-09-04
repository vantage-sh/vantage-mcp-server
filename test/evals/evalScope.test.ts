import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  discoverEvalCases,
  type EvalCaseFile,
  parseSelectedCasePaths,
  selectEvalCases,
} from "../../evals/_lib/evalScope";

const cases: EvalCaseFile[] = [
  { path: "file://cases/teams/get-team.eval.ts", resource: "teams", tool: "get-team" },
  { path: "file://cases/teams/get-team-members.eval.ts", resource: "teams", tool: "get-team-members" },
  { path: "file://cases/teams/get-teams.eval.ts", resource: "teams", tool: "get-teams" },
  { path: "file://cases/current-user/get-myself.eval.ts", resource: "current-user", tool: "get-myself" },
];

describe("eval scope selection", () => {
  it("discovers resource and tool names from case paths", () => {
    const discovered = discoverEvalCases(join(process.cwd(), "evals/cases"));
    expect(discovered).toContainEqual({
      path: "file://cases/current-user/get-myself.eval.ts",
      resource: "current-user",
      tool: "get-myself",
    });
  });

  it("matches one tool exactly instead of using a prefix or substring", () => {
    expect(selectEvalCases(cases, { all: false, resources: [], tools: ["get-team"] })).toEqual([cases[0]]);
  });

  it("unions repeated tools and resources without duplicates", () => {
    expect(
      selectEvalCases(cases, {
        all: false,
        resources: ["teams/"],
        tools: ["get-team", "get-myself"],
      })
    ).toEqual(cases);
  });

  it("rejects unknown exact selectors", () => {
    expect(() => selectEvalCases(cases, { all: false, resources: [], tools: ["team"] })).toThrow(
      "No eval case found for tool: team"
    );
    expect(() => selectEvalCases(cases, { all: false, resources: ["team"], tools: [] })).toThrow(
      "No eval cases found for resource: team"
    );
  });

  it("parses selected case paths passed to Promptfoo", () => {
    const selected = ["file://cases/teams/get-team.eval.ts"];
    expect(parseSelectedCasePaths(JSON.stringify(selected), [])).toEqual(selected);
    expect(parseSelectedCasePaths(undefined, selected)).toEqual(selected);
    expect(() => parseSelectedCasePaths("[]", selected)).toThrow("non-empty JSON array");
  });
});
