import z from "zod";
import MCPUserError from "./structure/MCPUserError";
import registerTool from "./structure/registerTool";
import paginationData from "./utils/paginationData";

const description = `
List infrastructure provider resources (instances, volumes, load balancers, etc.) from your cloud accounts.
Resources can be fetched either from a specific Resource Report or by using VQL filters.

When using a resource_report_token, you get the pre-filtered resources from that report.
When using VQL filters with workspace_token, you can dynamically query resources across your infrastructure.

VQL for Resource Reports enables filtering using two primary namespaces:

**Resources Namespace** - Access infrastructure attributes:
- resources.provider (AWS, GCP, Azure, etc.)
- resources.region (geographic location codes)
- resources.account_id and resources.provider_account_id
- resources.type (resource classification)
- resources.label and resources.uuid (identifiers)
- resources.metadata (detailed resource properties using ->> operator, e.g., resources.metadata->>'architecture')

**Tags Namespace** - Tag-based filtering:
- tags.name (tag key)
- tags.value (tag content)

VQL supports standard logical operators (AND, OR) and specialized functions:
- Pattern Matching: LIKE and NOT LIKE for substring searches
- Comparisons: IN/NOT IN for list evaluation; !=, <, >, <=, >= for values
- Metadata Queries: >> operator for resource metadata (e.g., resources.metadata->>'architecture')

VQL Representation of Resource Types:

| Provider | VQL Representation | Friendly Name |
|---|---|---|
| AWS | aws_auto_scaling_group | Auto Scaling Group |
| AWS | aws_cloudtrail | CloudTrail |
| AWS | aws_cloudwatch_log_group | CloudWatch Log Group |
| AWS | aws_db_instance | RDS Instance |
| AWS | aws_db_snapshot | RDS Snapshot |
| AWS | aws_docdb_cluster_instance | DocumentDB Cluster Instance |
| AWS | aws_dynamodb_table | DynamoDB Table |
| AWS | aws_ebs_volume | EBS Volume |
| AWS | aws_ec2_instance | EC2 Instance |
| AWS | aws_ec2_managed_prefix_list | EC2 Managed Prefix List |
| AWS | aws_ec2_reserved_instance | EC2 Reserved Instance |
| AWS | aws_ecs_service | ECS Service |
| AWS | aws_ecs_task_definition | ECS Task Definition |
| AWS | aws_egress_only_internet_gateway | Egress-Only Internet Gateway |
| AWS | aws_eip | Elastic IP |
| AWS | aws_elasticache_cluster | ElastiCache Cluster |
| AWS | aws_elasticsearch_domain | Elasticsearch Domain |
| AWS | aws_flow_log | Flow Log |
| AWS | aws_glacier_vault | Glacier Vault |
| AWS | aws_instance_snapshot | EC2 Instance Snapshot |
| AWS | aws_internet_gateway | Internet Gateway |
| AWS | aws_kms_key | KMS Key |
| AWS | aws_lambda_function | Lambda Function |
| AWS | aws_lb | Load Balancer |
| AWS | aws_nat_gateway | NAT Gateway |
| AWS | aws_rds_reserved_instance | RDS Reserved Instance |
| AWS | aws_redshift_cluster | Redshift Cluster |
| AWS | aws_s3_bucket | S3 Bucket |
| AWS | aws_savings_plan | Savings Plan |
| AWS | aws_secretsmanager_secret | Secrets Manager Secret |
| AWS | aws_vpc | VPC |
| AWS | aws_vpc_endpoint | VPC Endpoint |
| AWS | aws_vpn_gateway | VPN Gateway |

Example VQL queries:
- Multi-provider: (resources.provider IN ('aws', 'gcp'))
- Regional: (resources.provider = 'aws' AND resources.region = 'us-east-1')
- Resource type: (resources.provider = 'aws' AND resources.type = 'aws_ec2_instance')
- Metadata: (resources.provider = 'aws' AND resources.metadata->>'architecture' = 'x86_64')
- Tags: (resources.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production')
- Untagged resources: (resources.provider = 'aws' AND tags.name = NULL)

Set include_cost to true to get cost breakdowns by category for each resource.
Use the page parameter starting with 1 for pagination.

Resources include metadata specific to their type (EC2 instances show instance type, EBS volumes show size, etc.).
Each resource has a unique token that can be used to get more details or link to the Vantage Web UI.
`.trim();

export default registerTool({
	name: "list-provider-resources",
	description,
	args: {
		page: z.number().optional().default(1).describe("The page number to return, defaults to 1"),
		resource_report_token: z
			.string()
			.optional()
			.describe("The ResourceReport token to get resources from"),
		filter: z
			.string()
			.optional()
			.describe("VQL query to filter resources (requires workspace_token)"),
		workspace_token: z
			.string()
			.optional()
			.describe("The Workspace token to scope the query to (required when using filter)"),
		include_cost: z
			.boolean()
			.optional()
			.default(false)
			.describe("Include cost information broken down by category for each resource"),
	},
	async execute(args, ctx) {
		const response = await ctx.callVantageApi("/v2/resources", args, "GET");
		if (!response.ok) {
			throw new MCPUserError({ errors: response.errors });
		}
		return {
			resources: response.data.resources,
			pagination: paginationData(response.data),
		};
	},
});
