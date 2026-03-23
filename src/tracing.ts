import { AsyncLocalStorage } from "node:async_hooks";
import {
	buildOtlpExportPayload,
	buildSpanOutcome,
	type CompletedSpan,
	type ResolvedTracerConfig,
} from "./otlp";

type PrimitiveAttributeValue = boolean | number | string;
export type TraceAttributeValue = PrimitiveAttributeValue | PrimitiveAttributeValue[];
export type TraceAttributes = Record<string, TraceAttributeValue | undefined>;

export type TraceHeaders = {
	traceparent: string;
	tracestate?: string;
};

export type TraceContext = {
	traceId: string;
	spanId: string;
	traceFlags: string;
	tracestate?: string;
	sampled: boolean;
};

export type SpanKind = "client" | "consumer" | "internal" | "producer" | "server";

export type TraceSpan = TraceContext & {
	name: string;
	kind: SpanKind;
	parentSpanId?: string;
	startedAt: number;
	attributes: TraceAttributes;
};

type SpanStatus = {
	code: 0 | 1 | 2;
	message?: string;
};

/**
 * Minimal env shape for OTEL configuration.
 * All fields are optional — tracing is a no-op when unconfigured.
 */
export type OtelEnv = {
	ENVIRONMENT?: string;
	OTEL_EXPORTER_OTLP_ENDPOINT?: string;
	OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
	OTEL_EXPORTER_OTLP_HEADERS?: string;
	OTEL_RESOURCE_ATTRIBUTES?: string;
	OTEL_SERVICE_NAME?: string;
	OTEL_TRACES_SAMPLE_RATE?: string;
	SENTRY_RELEASE?: string;
};

export type StartSpanOptions = {
	attributes?: TraceAttributes;
	env?: OtelEnv;
	kind?: SpanKind;
	parent?: TraceContext;
	requestId?: string;
	tracestate?: string;
};

export type EndSpanOptions = {
	attributes?: TraceAttributes;
	env?: OtelEnv;
	error?: unknown;
	status?: SpanStatus;
};

type TraceFetchOptions = StartSpanOptions & {
	spanName?: string;
};

type WrapFetchHandlerOptions = {
	attributes?: TraceAttributes | ((request: Request) => TraceAttributes);
	spanName?: string | ((request: Request) => string);
};

export class CloudflareWorkerTracer {
	private readonly storage = new AsyncLocalStorage<TraceSpan>();
	private readonly pendingSpans: CompletedSpan[] = [];

	constructor(
		private readonly options: {
			exporterFetch?: typeof fetch;
			resourceAttributes?: TraceAttributes;
			sampleRate?: number;
			serviceName: string;
			scopeName?: string;
			scopeVersion?: string;
		}
	) {}

	getActiveSpan(): TraceSpan | undefined {
		return this.storage.getStore();
	}

	getActiveTraceContext(): TraceContext | undefined {
		const activeSpan = this.getActiveSpan();
		if (!activeSpan) {
			return undefined;
		}

		return {
			traceId: activeSpan.traceId,
			spanId: activeSpan.spanId,
			traceFlags: activeSpan.traceFlags,
			tracestate: activeSpan.tracestate,
			sampled: activeSpan.sampled,
		};
	}

	getTraceHeaders(context = this.getActiveTraceContext()): TraceHeaders | undefined {
		if (!context) {
			return undefined;
		}

		return {
			traceparent: this.formatTraceparent(context),
			...(context.tracestate ? { tracestate: context.tracestate } : {}),
		};
	}

	extractTraceContext(input: HeadersInit | Request | undefined): TraceContext | undefined {
		const traceparent = this.readHeader(input, "traceparent");
		if (!traceparent) {
			return undefined;
		}

		const match = traceparent
			.trim()
			.toLowerCase()
			.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/);

		if (!match) {
			return undefined;
		}

		const [, traceId, spanId, traceFlags] = match;
		if (isAllZeros(traceId) || isAllZeros(spanId)) {
			return undefined;
		}

		return {
			traceId,
			spanId,
			traceFlags,
			tracestate: this.readHeader(input, "tracestate"),
			sampled: (Number.parseInt(traceFlags, 16) & 1) === 1,
		};
	}

	startSpan(name: string, options: StartSpanOptions = {}): TraceSpan {
		const resolvedConfig = this.resolveConfig(options.env);
		const parent = options.parent ?? this.getActiveTraceContext();
		const traceId = parent?.traceId ?? normalizeTraceId(options.requestId);
		const sampled = parent?.sampled ?? this.shouldSample(resolvedConfig.sampleRate);
		const traceFlags = parent?.traceFlags ?? (sampled ? "01" : "00");

		return {
			traceId,
			spanId: randomHex(8),
			traceFlags,
			tracestate: options.tracestate ?? parent?.tracestate,
			sampled,
			name,
			kind: options.kind ?? "internal",
			parentSpanId: parent?.spanId,
			startedAt: Date.now(),
			attributes: cleanAttributes(options.attributes),
		};
	}

	endSpan(span: TraceSpan, options: EndSpanOptions = {}): void {
		if (!span.sampled) {
			return;
		}

		this.pendingSpans.push({
			span,
			attributes: {
				...span.attributes,
				...cleanAttributes(options.attributes),
			},
			outcome: buildSpanOutcome(options.error, options.status),
			endedAt: Date.now(),
		});
	}

	async flush(env?: OtelEnv): Promise<void> {
		const spans = this.pendingSpans.splice(0);
		if (spans.length === 0) {
			return;
		}

		const resolvedConfig = this.resolveConfig(env);
		if (!resolvedConfig.endpoint) {
			return;
		}

		try {
			const body = buildOtlpExportPayload(spans, resolvedConfig, {
				name: this.options.scopeName ?? "vantage-mcp-server-tracer",
				version: this.options.scopeVersion,
			});

			const response = await (this.options.exporterFetch ?? fetch)(resolvedConfig.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...resolvedConfig.headers,
				},
				body,
			});

			if (!response.ok) {
				console.warn(`OTLP export failed with status ${response.status}`);
			}
		} catch (error) {
			console.warn("Failed to export trace spans", error);
		}
	}

	async runWithSpan<T>(
		name: string,
		options: StartSpanOptions,
		fn: (span: TraceSpan) => Promise<T> | T
	): Promise<T> {
		const isRoot = !this.getActiveSpan();
		const span = this.startSpan(name, options);

		return this.storage.run(span, async () => {
			try {
				const result = await fn(span);
				this.endSpan(span, { env: options.env });
				if (isRoot) await this.flush(options.env);
				return result;
			} catch (error) {
				this.endSpan(span, {
					env: options.env,
					error,
					status: {
						code: 2,
						message: error instanceof Error ? error.message : "Unhandled error",
					},
				});
				if (isRoot) await this.flush(options.env);
				throw error;
			}
		});
	}

	traceFetch(
		fetcher: typeof fetch,
		input: RequestInfo | URL,
		init: RequestInit = {},
		options: TraceFetchOptions = {}
	): Promise<Response> {
		const method = init.method ?? (input instanceof Request ? input.method : "GET");
		const url = resolveUrl(input);
		const requestHeaders = new Headers(input instanceof Request ? input.headers : undefined);
		const initHeaders = new Headers(init.headers);
		initHeaders.forEach((value, key) => {
			requestHeaders.set(key, value);
		});

		const parsedUrl = new URL(url);
		const spanName = options.spanName ?? `${method.toUpperCase()} ${parsedUrl.pathname}`;
		const span = this.startSpan(spanName, {
			...options,
			kind: options.kind ?? "client",
			parent: options.parent ?? this.getActiveTraceContext(),
			attributes: {
				"resource.name": spanName,
				"http.request.method": method.toUpperCase(),
				"http.route": parsedUrl.pathname,
				"server.address": parsedUrl.hostname,
				"url.full": url,
				"url.path": parsedUrl.pathname,
				...options.attributes,
			},
		});
		const traceHeaders = this.getTraceHeaders(span);

		if (traceHeaders) {
			requestHeaders.set("traceparent", traceHeaders.traceparent);
			if (traceHeaders.tracestate) {
				requestHeaders.set("tracestate", traceHeaders.tracestate);
			}
		}

		const tracedInit = {
			...init,
			headers: requestHeaders,
		};

		return this.storage.run(span, async () => {
			try {
				const response =
					input instanceof Request
						? await fetcher(new Request(input, tracedInit))
						: await fetcher(input, tracedInit);

				this.endSpan(span, {
					env: options.env,
					attributes: {
						"http.response.status_code": response.status,
					},
					status: httpStatusToSpanStatus(response.status),
				});

				return response;
			} catch (error) {
				this.endSpan(span, {
					env: options.env,
					error,
					status: {
						code: 2,
						message: error instanceof Error ? error.message : "Fetch failed",
					},
				});
				throw error;
			}
		});
	}

	wrapFetchHandler<E extends OtelEnv>(
		handler: (request: Request, env: E, ctx: ExecutionContext) => Promise<Response> | Response,
		options: WrapFetchHandlerOptions = {}
	) {
		return async (request: Request, env: E, ctx: ExecutionContext): Promise<Response> => {
			const parsedUrl = new URL(request.url);
			const span = this.startSpan(
				typeof options.spanName === "function"
					? options.spanName(request)
					: (options.spanName ?? `${request.method.toUpperCase()} ${parsedUrl.pathname}`),
				{
					env,
					kind: "server",
					parent: this.extractTraceContext(request),
					attributes: {
						"http.request.method": request.method.toUpperCase(),
						"http.route": parsedUrl.pathname,
						"server.address": parsedUrl.hostname,
						"url.full": request.url,
						"url.path": parsedUrl.pathname,
						...(typeof options.attributes === "function"
							? options.attributes(request)
							: options.attributes),
					},
				}
			);

			return this.storage.run(span, async () => {
				try {
					const response = await handler(request, env, ctx);
					const ttfbMs = Date.now() - span.startedAt;
					const spanAttributes = {
						"http.response.status_code": response.status,
						"http.response.ttfb_ms": ttfbMs,
					};

					if (response.body) {
						const tracedResponse = this.wrapStreamingResponse(
							response,
							span,
							env,
							ctx,
							spanAttributes
						);
						return withTraceHeaders(tracedResponse, this.getTraceHeaders(span));
					}

					this.endSpan(span, {
						env,
						attributes: spanAttributes,
						status: httpStatusToSpanStatus(response.status),
					});
					await this.flush(env);

					return withTraceHeaders(response, this.getTraceHeaders(span));
				} catch (error) {
					this.endSpan(span, {
						env,
						error,
						status: {
							code: 2,
							message:
								error instanceof Error ? error.message : "Unhandled fetch error",
						},
					});
					await this.flush(env);
					throw error;
				}
			});
		};
	}

	private wrapStreamingResponse(
		response: Response,
		span: TraceSpan,
		env: OtelEnv,
		ctx: ExecutionContext,
		baseAttributes: TraceAttributes
	): Response {
		const { readable, writable } = new TransformStream();

		const pipePromise = response.body!.pipeTo(writable).then(
			() => {
				this.endSpan(span, {
					env,
					attributes: {
						...baseAttributes,
						"http.response.duration_ms": Date.now() - span.startedAt,
					},
					status: httpStatusToSpanStatus(response.status),
				});
				return this.flush(env);
			},
			(error) => {
				this.endSpan(span, {
					env,
					attributes: baseAttributes,
					error,
					status: {
						code: 2,
						message: error instanceof Error ? error.message : "Stream error",
					},
				});
				return this.flush(env);
			}
		);

		ctx.waitUntil(pipePromise);

		return new Response(readable, {
			headers: response.headers,
			status: response.status,
			statusText: response.statusText,
		});
	}

	private readHeader(input: HeadersInit | Request | undefined, name: string): string | undefined {
		if (!input) {
			return undefined;
		}

		if (input instanceof Request) {
			return input.headers.get(name) ?? undefined;
		}

		const matchedEntry = Object.entries(input as Record<string, string>).find(
			([key]) => key.toLowerCase() === name.toLowerCase()
		);
		return matchedEntry?.[1];
	}

	private resolveConfig(env?: OtelEnv): ResolvedTracerConfig {
		// Use || so empty strings are treated as "not set".
		const endpoint =
			env?.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
			toTracesEndpoint(env?.OTEL_EXPORTER_OTLP_ENDPOINT);
		const sampleRate =
			parseSampleRate(env?.OTEL_TRACES_SAMPLE_RATE) ?? this.options.sampleRate ?? 1;

		return {
			endpoint,
			headers: parseKeyValueList(env?.OTEL_EXPORTER_OTLP_HEADERS),
			resourceAttributes: {
				...this.options.resourceAttributes,
				...parseKeyValueList(env?.OTEL_RESOURCE_ATTRIBUTES),
				...(env?.ENVIRONMENT ? { "deployment.environment.name": env.ENVIRONMENT } : {}),
			},
			sampleRate,
			serviceName: env?.OTEL_SERVICE_NAME || this.options.serviceName,
			serviceVersion: env?.SENTRY_RELEASE,
		};
	}

	private shouldSample(sampleRate: number): boolean {
		if (sampleRate <= 0) {
			return false;
		}

		if (sampleRate >= 1) {
			return true;
		}

		return Math.random() < sampleRate;
	}

	private formatTraceparent(context: TraceContext): string {
		return `00-${context.traceId}-${context.spanId}-${context.traceFlags}`;
	}
}

// --- Private helpers (free functions, not on the class) ---

function cleanAttributes(attributes?: TraceAttributes): TraceAttributes {
	if (!attributes) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(attributes).filter(([, value]) => value !== undefined)
	);
}

function httpStatusToSpanStatus(statusCode: number): SpanStatus {
	if (statusCode >= 500) {
		return { code: 2, message: `HTTP ${statusCode}` };
	}

	return { code: 1 };
}

function isAllZeros(value: string): boolean {
	return /^0+$/.test(value);
}

function normalizeTraceId(requestId?: string): string {
	if (!requestId) {
		return randomHex(16);
	}

	const normalized = requestId.replace(/-/g, "").toLowerCase();
	if (/^[0-9a-f]{32}$/.test(normalized) && !isAllZeros(normalized)) {
		return normalized;
	}

	return randomHex(16);
}

function parseKeyValueList(value?: string): Record<string, string> {
	if (!value) {
		return {};
	}

	return Object.fromEntries(
		value
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean)
			.map((entry) => {
				const separatorIndex = entry.indexOf("=");
				if (separatorIndex === -1) {
					return [entry, ""];
				}

				return [
					entry.slice(0, separatorIndex).trim(),
					entry.slice(separatorIndex + 1).trim(),
				];
			})
			.filter(([key]) => key.length > 0)
	);
}

function parseSampleRate(value?: string): number | undefined {
	if (!value) {
		return undefined;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return undefined;
	}

	return Math.min(1, Math.max(0, parsed));
}

function randomHex(byteLength: number): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}

	if (input instanceof URL) {
		return input.toString();
	}

	return input.url;
}

function toTracesEndpoint(endpoint?: string): string | undefined {
	if (!endpoint) {
		return undefined;
	}

	if (endpoint.endsWith("/v1/traces")) {
		return endpoint;
	}

	return new URL("v1/traces", endpoint.endsWith("/") ? endpoint : `${endpoint}/`).toString();
}

function withTraceHeaders(response: Response, traceHeaders: TraceHeaders | undefined): Response {
	if (!traceHeaders) {
		return response;
	}

	const headers = new Headers(response.headers);
	headers.set("traceparent", traceHeaders.traceparent);
	if (traceHeaders.tracestate) {
		headers.set("tracestate", traceHeaders.tracestate);
	}

	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText,
	});
}
