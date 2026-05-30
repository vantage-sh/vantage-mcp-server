import { defineConfig } from "evalite/config";
import { createSqliteStorage } from "evalite/sqlite-storage";

export default defineConfig({
  testTimeout: 60_000,
  maxConcurrency: 4,
  forceRerunTriggers: ["src/tools/**/*.ts", "evals/_lib/**/*.ts"],
  storage: () => createSqliteStorage("./evals/evalite.db"),
});
