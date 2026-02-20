import z from "zod/v4";
import { DEFAULT_LIMIT } from "./structure/constants";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const SUPPORTED_PROVIDERS = ["aws", "gcp", "azure", "kubernetes", "datadog"] as const;

const PROVIDER_ALIASES: Record<string, (typeof SUPPORTED_PROVIDERS)[number]> = {
	aws: "aws",
	amazon: "aws",
	"amazon web services": "aws",
	gcp: "gcp",
	google: "gcp",
	"google cloud": "gcp",
	azure: "azure",
	"microsoft azure": "azure",
	kubernetes: "kubernetes",
	k8s: "kubernetes",
	datadog: "datadog",
};

const PROVIDER_ALIAS_KEYS = Object.keys(PROVIDER_ALIASES).sort((a, b) => b.length - a.length);

const RECOMMENDATION_CATEGORY_TO_TYPE_LOOKUP: Record<string, string> = {
	az_compute_reserved_instances: "azure:compute:reserved-instances",
	az_compute_reserved_instances_app_service: "azure:app-service:reserved-instances",
	az_compute_reserved_instances_cosmos: "azure:cosmosdb:reserved-instances",
	az_compute_reserved_instances_sql: "azure:sqldb:reserved-instances",
	az_disks_unattached: "azure:disks:unattached",
	cloudfront_cloudflare: "aws:cloudfront:excessive-egress",
	cw_log_retention_policy: "aws:cloudwatch:log-retention",
	database_savings_plan: "aws:database:savings-plan",
	datadog_financial_commitments: "datadog:commitment:opportunity",
	ebs_compute_optimizer_recommender: "aws:ebs:rightsizing",
	ebs_gp2_to_gp3: "aws:ebs:gp2-to-gp3",
	ebs_unattached_volume: "aws:ebs:unattached-volume",
	ec2_compute_optimizer_recommender: "aws:ec2:co-rightsizing",
	ec2_generational_upgrades: "aws:ec2:generational-upgrade",
	ec2_rightsizing_recommender: "aws:ec2:rightsizing",
	ec2_snapshot_recommender: "aws:ec2:snapshot-cleanup",
	ecs_compute_optimizer_recommender: "aws:ecs:rightsizing",
	eks_approaching_extended_support_window: "aws:eks:nearing-extended-support",
	eks_in_extended_support_window: "aws:eks:in-extended-support",
	elastic_search_reserved_instances: "aws:opensearch:reserved-instances",
	elasticache_reserved_instances: "aws:elasticache:reserved-instances",
	es_generational_upgrades: "aws:opensearch:generational-upgrade",
	gcp_compute_commitment_recommender: "gcp:compute:commitment",
	gcp_compute_rightsizing_recommender: "gcp:compute:rightsizing",
	idle_compute_optimizer_recommender: "idle-resource",
	ip_unattached: "aws:elastic-ip:unattached",
	kubernetes_recommender: "kubernetes:workload:rightsizing",
	lambda_compute_optimizer_recommender: "aws:lambda:rightsizing",
	rds_approaching_extended_support_window: "aws:rds:nearing-extended-support",
	rds_compute_optimizer_recommender: "aws:rds:rightsizing",
	rds_generational_upgrades: "aws:rds:generational-upgrade",
	rds_in_extended_support_window: "aws:rds:in-extended-support",
	rds_reserved_instances: "aws:rds:reserved-instances",
	redshift_reserved_instances: "aws:redshift:reserved-instances",
	s3_bucket_glacier_instant_retrieval: "aws:s3:glacier-instant-retrieval",
	s3_bucket_intelligent_tiering: "aws:s3:intelligent-tiering",
	s3_cloudflare: "aws:s3:egress-cloudflare",
	savings_plan: "aws:compute:savings-plan",
	unused_financial_commitments: "aws:ec2:unused-reserved-instances",
	workspace_stranded: "aws:workspaces:stranded",
	workspace_unused: "aws:workspaces:unused",
	azure_blob_storage_reserved_instances_recommender: "azure:blob-storage:reserved-instances",
	azure_compute_savings_recommender: "azure:compute:savings-plan",
	azure_files_reserved_instances_recommender: "azure:files:reserved-instances",
	azure_rightsizing_recommender: "azure:vm:rightsizing",
	azure_sql_paas_db_reserved_instances_recommender: "azure:sql-paas-db:reserved-instances",
	datadog_metrics_unqueried: "datadog:metrics:unqueried",
	dynamodb_reserved_capacity_recommender: "aws:dynamodb:reserved-capacity",
};

const normalizeProvider = (value: unknown) => {
	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();
	return PROVIDER_ALIASES[normalized] ?? normalized;
};

const normalizeRecommendationType = (value: unknown) => {
	if (typeof value !== "string") {
		return value;
	}

	let normalized = value.trim().toLowerCase();

	// Common natural-language suffix that should not be sent as part of the API filter.
	normalized = normalized.replace(/\brecommendations?\b/g, "").trim();
	normalized = normalized.replace(/\s*:\s*/g, ":");
	normalized = normalized.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return undefined;
	}

	const mappedCategoryType = RECOMMENDATION_CATEGORY_TO_TYPE_LOOKUP[normalized];
	if (mappedCategoryType) {
		return mappedCategoryType;
	}

	const directProviderAlias = PROVIDER_ALIASES[normalized];
	if (directProviderAlias) {
		return directProviderAlias;
	}

	if (normalized.includes(":")) {
		const [head, ...rest] = normalized.split(":");
		const canonicalProvider = PROVIDER_ALIASES[head];
		if (canonicalProvider) {
			const suffix = rest.join(":").trim();
			return suffix ? `${canonicalProvider}:${suffix}` : canonicalProvider;
		}
		return normalized;
	}

	for (const alias of PROVIDER_ALIAS_KEYS) {
		if (!normalized.startsWith(`${alias} `)) {
			continue;
		}
		return PROVIDER_ALIASES[alias];
	}

	return normalized || undefined;
};

const description = `
List all cost optimization recommendations available in the Vantage account. Recommendations are AI-powered suggestions that help identify opportunities to reduce costs and optimize cloud spending across your infrastructure.

Use the page value of 1 to start pagination.

Recommendations include various types such as:
- EC2 rightsizing (resize overprovisioned instances)
- Unused financial commitments (unused Reserved Instances or Savings Plans)
- Idle resources (running but unused instances, volumes, load balancers)
- Storage optimization (EBS volume type recommendations)
- Reserved Instance and Savings Plan purchase recommendations

Each recommendation includes:
- Potential cost savings amount
- Description of what can be optimized
- Provider and service information
- Number of resources affected
- Current status (open, resolved, dismissed)

Recommendations can be filtered by status (open shows active recommendations, resolved shows implemented ones, dismissed shows ignored ones), cloud provider (aws, azure, gcp), specific workspace, provider account ID, and recommendation type. Prefer the type parameter when users ask for broad families (e.g. "AWS recommendations" -> type=aws; "EC2 rightsizing" -> type=aws:ec2:rightsizing). The type filter uses case-insensitive fuzzy matching on the recommendation type.

The token of each recommendation can be used with other recommendation tools to get detailed information and see specific resources affected.

For users to view and manage recommendations in the Vantage Web UI, they can visit https://console.vantage.sh/recommendations
`.trim();

const args = {
	page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
	workspace_token: z
		.string()
		.optional()
		.describe("Filter recommendations to a specific workspace"),
	provider: z
		.preprocess(normalizeProvider, z.enum(SUPPORTED_PROVIDERS).optional())
		.optional()
		.describe(
			"Filter recommendations by cloud provider (aws, gcp, azure, kubernetes, datadog). Aliases like 'Amazon Web Services' and 'Google Cloud' are normalized."
		),
	provider_account_id: z
		.string()
		.optional()
		.describe("Filter recommendations by provider account ID"),
	type: z
		.preprocess(normalizeRecommendationType, z.string().max(255).optional())
		.optional()
		.describe(
			"Filter recommendations by type with case-insensitive fuzzy matching (e.g., aws, aws:ec2, aws:ec2:rightsizing). Natural language values like 'AWS recommendations' are normalized."
		),
	filter: z
		.enum(["open", "resolved", "dismissed"])
		.optional()
		.describe("Filter recommendations by status: open (default), resolved, or dismissed"),
};

export default registerTool({
	name: "list-recommendations",
	description,
	annotations: {
		destructive: false,
		openWorld: false,
		readOnly: true,
	},
	args,
	async execute(args, ctx) {
		const requestParams = {
			...args,
			limit: DEFAULT_LIMIT,
			provider: args.provider as any,
		};
		const response = await ctx.callVantageApi("/v2/recommendations", requestParams, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			recommendations: response.data.recommendations,
			pagination: paginationData(response.data),
		};
	},
});
