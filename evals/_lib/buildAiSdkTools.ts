import { type ToolSet, tool } from "ai";
import z from "zod/v4";
import "../../src/tools";
import MCPUserError from "../../src/tools/structure/MCPUserError";
import { getRegisteredTool, getRegisteredToolExecutor } from "../../src/tools/structure/registerTool";
import { type ApiFixture, type ApiRequestRecord, createFixtureApi } from "./apiFixtures";

export type ToolExecutionLog = {
  requests: ApiRequestRecord[];
  error?: string;
};

export type FixtureExecution = {
  fixtures: readonly ApiFixture[];
  /** Filled per AI SDK tool call id as handlers run. */
  executions: Map<string, ToolExecutionLog>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

function fixtureExecute(name: string, fixtureExecution: FixtureExecution) {
  const executor = getRegisteredToolExecutor(name);
  if (!executor) {
    throw new Error(`Tool not registered: ${name}. Did src/tools/index.ts forget to import it?`);
  }

  return async (input: Record<string, unknown>, options: { toolCallId: string }): Promise<unknown> => {
    const log: ToolExecutionLog = { requests: [] };
    fixtureExecution.executions.set(options.toolCallId, log);
    const callVantageApi = createFixtureApi(fixtureExecution.fixtures, log.requests);
    try {
      return await executor(input, { callVantageApi });
    } catch (error) {
      if (error instanceof MCPUserError) {
        log.error = JSON.stringify(error.exception);
        return { isError: true, ...error.exception };
      }
      log.error = errorMessage(error);
      throw error;
    }
  };
}

/**
 * Without fixtures, every tool is a no-op so only selection is under test.
 * With fixtures, each tool runs its real handler against canned API responses.
 */
export function buildAiSdkTools(names: readonly string[], fixtureExecution?: FixtureExecution): ToolSet {
  const out: ToolSet = {};
  for (const name of names) {
    const props = getRegisteredTool(name);
    if (!props) {
      throw new Error(`Tool not registered: ${name}. Did src/tools/index.ts forget to import it?`);
    }
    out[name] = tool({
      description: props.description,
      inputSchema: z.object(props.args),
      // OpenAI Responses API fills omitted optionals with "" / placeholders unless
      // strict is explicitly false. Chat Completions omits them correctly either way.
      strict: false,
      execute: fixtureExecution ? fixtureExecute(name, fixtureExecution) : async () => ({}),
    });
  }
  return out;
}
