// Omit the ENVIRONMENT that is hardcoded into the wrangler files
export type AppEnv = Omit<Env, "ENVIRONMENT"> & {
  ENVIRONMENT: "development" | "production";
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_RESOURCE_ATTRIBUTES?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
  OTEL_TRACES_SAMPLE_RATE?: string;
};
