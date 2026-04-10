import type {
	pathEncode,
	Path as VantagePath,
	RequestBodyForPathAndMethod as VantageRequestBodyForPathAndMethod,
	ResponseBodyForPathAndMethod as VantageResponseBodyForPathAndMethod,
	SupportedMethods as VantageSupportedMethods,
} from "@vantage-sh/vantage-client";

type EncodedPathSegment = ReturnType<typeof pathEncode>;

export type CostReportGraphPath = `/v2/cost_reports/${EncodedPathSegment}/graph`;

export type CostReportGraphRequest = {
	start_date?: string;
	end_date?: string;
	date_interval?: string;
	date_bin?: "cumulative" | "day" | "week" | "month" | "quarter";
	chart_type?: "line" | "area" | "stacked_area" | "bar" | "multi_bar" | "stacked_bar" | "pie";
	groupings?: string;
	filter?: string;
	saved_filter_tokens?: string[];
};

export type CostReportGraphResponse = {
	url: string;
	report_token: string;
	title: string;
};

export type Path = VantagePath | CostReportGraphPath;

export type SupportedMethods<P extends Path> = P extends CostReportGraphPath
	? "GET"
	: VantageSupportedMethods<Extract<P, VantagePath>>;

export type RequestBodyForPathAndMethod<
	P extends Path,
	M extends SupportedMethods<P>,
> = P extends CostReportGraphPath
	? M extends "GET"
		? CostReportGraphRequest
		: never
	: P extends VantagePath
		? VantageRequestBodyForPathAndMethod<P, Extract<M, VantageSupportedMethods<P>>>
		: never;

export type ResponseBodyForPathAndMethod<
	P extends Path,
	M extends SupportedMethods<P>,
> = P extends CostReportGraphPath
	? M extends "GET"
		? CostReportGraphResponse
		: never
	: P extends VantagePath
		? VantageResponseBodyForPathAndMethod<P, Extract<M, VantageSupportedMethods<P>>>
		: never;
