import type { SpanKind, TraceAttributes, TraceSpan } from "./tracing";

type PrimitiveAttributeValue = boolean | number | string;

type SpanStatus = {
	code: 0 | 1 | 2;
	message?: string;
};

export type ResolvedTracerConfig = {
	endpoint?: string;
	headers: Record<string, string>;
	resourceAttributes: TraceAttributes;
	sampleRate: number;
	serviceName: string;
	serviceVersion?: string;
};

type ScopeInfo = {
	name: string;
	version?: string;
};

export type SpanOutcome = {
	events: Array<Record<string, unknown>>;
	status: SpanStatus;
};

export type CompletedSpan = {
	span: TraceSpan;
	attributes: TraceAttributes;
	outcome: SpanOutcome;
	endedAt: number;
};

export function buildSpanOutcome(error: unknown, status: SpanStatus | undefined): SpanOutcome {
	if (!error) {
		return {
			events: [],
			status: status ?? { code: 0 },
		};
	}

	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorName = error instanceof Error ? error.name : "Error";

	return {
		events: [
			{
				name: "exception",
				timeUnixNano: toUnixNanos(Date.now()),
				attributes: toOtlpAttributes({
					"exception.message": errorMessage,
					"exception.type": errorName,
					...(error instanceof Error && error.stack
						? { "exception.stacktrace": error.stack }
						: {}),
				}),
			},
		],
		status: status ?? { code: 2, message: errorMessage },
	};
}

export function buildOtlpExportPayload(
	completedSpans: CompletedSpan[],
	config: ResolvedTracerConfig,
	scope: ScopeInfo
): string {
	return JSON.stringify({
		resourceSpans: [
			{
				resource: {
					attributes: toOtlpAttributes({
						"service.name": config.serviceName,
						...(config.serviceVersion
							? { "service.version": config.serviceVersion }
							: {}),
						...config.resourceAttributes,
					}),
				},
				scopeSpans: [
					{
						scope: {
							name: scope.name,
							...(scope.version ? { version: scope.version } : {}),
						},
						spans: completedSpans.map(({ span, attributes, outcome, endedAt }) => ({
							traceId: span.traceId,
							spanId: span.spanId,
							...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
							name: span.name,
							kind: toOtlpSpanKind(span.kind),
							startTimeUnixNano: toUnixNanos(span.startedAt),
							endTimeUnixNano: toUnixNanos(endedAt),
							attributes: toOtlpAttributes(attributes),
							status: outcome.status,
							...(outcome.events.length > 0 ? { events: outcome.events } : {}),
						})),
					},
				],
			},
		],
	});
}

export function toOtlpAttributes(attributes: TraceAttributes): Array<Record<string, unknown>> {
	return Object.entries(attributes).flatMap(([key, value]) => {
		if (value === undefined) {
			return [];
		}

		if (Array.isArray(value)) {
			return [
				{
					key,
					value: {
						arrayValue: {
							values: value.map((item) => toOtlpAnyValue(item)),
						},
					},
				},
			];
		}

		return [{ key, value: toOtlpAnyValue(value) }];
	});
}

function toOtlpAnyValue(value: PrimitiveAttributeValue): Record<string, unknown> {
	if (typeof value === "boolean") {
		return { boolValue: value };
	}

	if (typeof value === "number") {
		if (Number.isInteger(value)) {
			return { intValue: String(value) };
		}

		return { doubleValue: value };
	}

	return { stringValue: value };
}

function toOtlpSpanKind(kind: SpanKind): number {
	switch (kind) {
		case "server":
			return 2;
		case "client":
			return 3;
		case "producer":
			return 4;
		case "consumer":
			return 5;
		default:
			return 1;
	}
}

function toUnixNanos(timestampMs: number): string {
	return `${Math.trunc(timestampMs)}000000`;
}
