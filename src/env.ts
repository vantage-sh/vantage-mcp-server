// Omit the ENVIRONMENT that is hardcoded into the wrangler files
export type AppEnv = Omit<Env, "ENVIRONMENT"> & {
  ENVIRONMENT: "development" | "production";
};
