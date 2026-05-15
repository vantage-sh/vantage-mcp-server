// Omit the ENVIRONMENT that is hardcoded into the wrangler files
export type AppEnv = Omit<Env, "ENVIRONMENT"> & {
  ENVIRONMENT: "development" | "production";
  OTLP_TRACES_ENDPOINT?: string;
  OTLP_HEADERS?: string;
  OTEL_RESOURCE_ATTRIBUTES?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_TRACES_SAMPLE_RATE?: string;
  SENTRY_RELEASE?: string;
};
