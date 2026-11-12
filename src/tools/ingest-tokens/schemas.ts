import { vantageToken } from "../../utils/zod";

export const feedToken = vantageToken("enrichment_source", {
  description:
    "Existing telemetry feed, such as Bifrost, OpenRouter, or Cloudflare AI Gateway telemetry. Bucket-based sources do not support ingest tokens.",
});
