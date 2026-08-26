const PROMPTFOO_ASSERTION_FAILURE_EXIT_CODE = 100;

function hasEvalOutput(exitCode: number): boolean {
  return exitCode === 0 || exitCode === PROMPTFOO_ASSERTION_FAILURE_EXIT_CODE;
}

export async function finalizeEvalRun(
  exitCode: number,
  persistOutput: () => Promise<string[]>,
  cleanupOutput: () => Promise<void>
): Promise<string[] | undefined> {
  try {
    if (!hasEvalOutput(exitCode)) {
      return undefined;
    }

    return await persistOutput();
  } finally {
    await cleanupOutput();
  }
}
