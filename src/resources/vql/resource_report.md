---
title: VQL for Resource Reports
description: Learn how to use VQL when querying Resource Reports in Vantage.
---

> **Tip:** If you need help constructing a VQL query, navigate to the **Resource Reports** page in the Vantage console and click **New Resource Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Resource Reports VQL Schema

VQL for Resources Reports comprises two namespaces: `resources` and `tags`, which represent the available filters on Resource Reports in the Vantage console. To reference a filter, use the following syntax: `namespace.field` (e.g., `resources.region` or `tags.name`). The following fields are available within these namespaces.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| `resources` | `provider` | [Providers example](#combining-providers) |
| `resources` | `region` | [Region example](#resources-from-a-list-of-regions) |
| `resources` | `account_id` | [Account example](#resources-by-account-id) |
| `resources` | `provider_account_id` | [Billing Account example](#resources-by-billing-account) |
| `resources` | `type` | [Resource Type example](#resources-by-resource-type) |
| `resources` | `label` | [Label example](#resources-by-label) |
| `resources` | `uuid` | [UUID (AWS ARN) example](#resources-for-specific-arn) |
| `resources` | `metadata` | [Metadata example](#resources-by-metadata) |
| `tags` | `name` | [Tags name/value example](#filter-by-tag) |
| `tags` | `value` | [Untagged example](#filter-for-untagged-resources) |

> **Note:** Availability of the fields listed above varies among different cloud providers.

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| `AND` | Logical AND operator | `resources.provider = 'aws' AND resources.label = '123456'` | This example filters AWS resources, with a specific associated label, where both conditions must be true. |
| `OR` | Logical OR operator | `(resources.provider = 'aws') OR (resources.provider = 'gcp')` | This example retrieves resources from either AWS or GCP. At least one condition must be true. |
| `LIKE` and `NOT LIKE` | Performs string comparisons | `resources.provider = 'aws' AND resources.uuid LIKE '%arn:aws:s3:::my-bucket%'` | This example selects data where the resource ARN contains `arn:aws:s3:::my-bucket`, such as `arn:aws:s3:::my-bucket-123`.  <br /><br />     This same query also works for `NOT LIKE` where data does not contain a particular string: `resources.provider = 'aws' AND resources.uuid NOT LIKE '%arn:aws:s3:::my-bucket%'`. |
| `IN`/`NOT IN` | Used to compare against an array list | `(resources.provider = 'aws' AND (resources.region IN ('ap-northeast-1','ap-northeast-3')))` | This example filters based on a list of regions, returning data for the specified regions  <br /><br />     You can also use `NOT IN` to find results that are anything but the items within the list: `(resources.provider = 'aws' AND (resources.region NOT IN ('ap-northeast-1','ap-northeast-3')))` |
| `!=` | Represents negation, "is not" | `resources.provider = 'azure' AND (resources.type != 'azurerm_public_ip' AND resources.type != 'azurerm_kubernetes_cluster')` | This example filters out data from two specified resource types, providing all Azure resources that are *not* these types. |
| `<`, `>`, `<=`, `>=` | Mathematical operators for numerical queries | `resources.provider = 'azure' AND (resources.type = 'azurerm_virtual_machine' AND resources.metadata->>'virtual_machine_size' > '7')` | This example looks for Virtual Machines that have a size greater than 7. |
| `->>` | This operator is used only when constructing queries related to metadata | `resources.provider = 'aws' AND (resources.type = 'aws_instance' AND resources.metadata->>'architecture' = 'x86_64')` | This example looks for EC2 instances with an architecture of `x86_64`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Combining Providers

Filter for provider resources associated with either AWS or GCP.

```sql
(resources.provider = 'aws') OR (resources.provider = 'gcp')
```

### Resources from a List of Regions

Filter for AWS resources in two regions. Note that you will need to use the region code, such as `us-east-1`.

```sql
resources.provider = 'aws' AND (resources.region = 'us-east-1' OR resources.region = 'us-west-1')
```

### Resources by Account ID

Resources for a specific set of resource types and account ID.

```sql
resources.provider = 'gcp' AND (resources.account_id = 'user-proj-1234') AND (resources.type = 'google_compute_disk' OR resources.type = 'google_compute_instance')
```

### Resources by Billing Account

Resources for a specific billing account.

```sql
resources.provider = 'aws' AND (resources.provider_account_id = '11111111111')
```

### Resources by Resource Type

Filter resources to see a specific resource type. In the example below, the query is looking for any AWS resource that is *not* an AWS CloudFront Distribution. Resource types are represented like `aws_cloudfront_distribution`.

```sql
resources.provider = 'aws' AND (resources.type != 'aws_cloudfront_distribution')
```

#### Available Resource Type VQL Representations
| Provider | VQL Representation | Friendly Name |
| --- | --- | --- |
| AWS | aws_app_stream_fleet | App Stream Fleet |
| AWS | aws_app_stream_image_builder | App Stream Image Builder |
| AWS | aws_auto_scaling_group | Auto Scaling Group |
| AWS | aws_backup_vault_recovery_point | Backup Vault Recovery Vault |
| AWS | aws_batch_job_definition | Batch Job Definition |
| AWS | aws_carrier_gateway | Carrier Gateway |
| AWS | aws_cloudfront_distribution | CloudFront Distribution |
| AWS | aws_cloudtrail | CloudTrail |
| AWS | aws_cloudwatch_log_group | CloudWatch Log Group |
| AWS | aws_codebuild_project | CodeBuild Project |
| AWS | aws_codepipeline | CodePipeline |
| AWS | aws_config_config_rule | Config Rule |
| AWS | aws_db_instance | RDS Instance |
| AWS | aws_db_snapshot | RDS Snapshot |
| AWS | aws_docdb_cluster_instance | DocumentDB Cluster Instance |
| AWS | aws_dynamodb_table | DynamoDB Table |
| AWS | aws_ebs_volume | EBS Volume |
| AWS | aws_ec2_instance | EC2 Instance |
| AWS | aws_ec2_managed_prefix_list | EC2 Managed Prefix List |
| AWS | aws_ec2_reserved_instance | EC2 Reserved Instance |
| AWS | aws_ec2_transit_gateway | EC2 Transit Gateway |
| AWS | aws_ecr_repository | ECR Repository |
| AWS | aws_ecs_service | ECS Service |
| AWS | aws_ecs_task_definition | ECS Task Definition |
| AWS | aws_efs_file_system | EFS File System |
| AWS | aws_egress_only_internet_gateway | Egress-Only Internet Gateway |
| AWS | aws_eip | Elastic IP |
| AWS | aws_elasticache_cluster | ElastiCache Cluster |
| AWS | aws_elasticsearch_domain | Elasticsearch Domain |
| AWS | aws_flow_log | Flow Log |
| AWS | aws_fsx_volume | FsX Volume |
| AWS | aws_fsx_file_system | FsX File System |
| AWS | aws_glacier_vault | Glacier Vault |
| AWS | aws_globalaccelerator_accelerator | Global Accelerator |
| AWS | aws_glue_job | Glue Job |
| AWS | aws_instance_snapshot | EC2 Instance Snapshot |
| AWS | aws_internet_gateway | Internet Gateway |
| AWS | aws_kms_key | KMS Key |
| AWS | aws_lambda_function | Lambda Function |
| AWS | aws_lb | Load Balancer |
| AWS | aws_mediaconnect_flow | MediaConnect Flow |
| AWS | aws_mediaconvert_job | MediaConvert Job |
| AWS | aws_medialive_channel | MediaLive Channel |
| AWS | aws_media_package_channel | MediaPackage Channel |
| AWS | aws_media_package_vod_asset | MediaPackage VOD Asset |
| AWS | aws_media_store_container | MediaStore Container |
| AWS | aws_media_tailor_channel | MediaTailor Channel |
| AWS | aws_media_tailor_playback_configuration | MediaTailor Playback Configuration |
| AWS | aws_mq_broker | MQ Broker |
| AWS | aws_msk_cluster | MSK Cluster |
| AWS | aws_nat_gateway | NAT Gateway |
| AWS | aws_network_interface | Network Interface |
| AWS | aws_outposts_outpost | Outposts Outpost |
| AWS | aws_rds_reserved_instance | RDS Reserved Instance |
| AWS | aws_redshift_cluster | Redshift Cluster |
| AWS | aws_report_definition | Report Definition |
| AWS | aws_route53_resolver_query_log_config | Route 53 Resolver Query Log Config |
| AWS | aws_route53_zone | Route 53 Zone |
| AWS | aws_route_table | Route Table |
| AWS | aws_s3_bucket | S3 Bucket |
| AWS | aws_sagemaker_model | SageMaker Model |
| AWS | aws_savings_plan | Savings Plan |
| AWS | aws_secretsmanager_secret | Secrets Manager Secret |
| AWS | aws_sns_topic | SNS Topic |
| AWS | aws_sqs_queue | SQS Queue |
| AWS | aws_subnet | Subnet |
| AWS | aws_transfer_server | Transfer Server |
| AWS | aws_vpc | VPC |
| AWS | aws_vpc_endpoint | VPC Endpoint |
| AWS | aws_vpc_peering_connection | VPC Peering Connection |
| AWS | aws_vpn_gateway | VPN Gateway |
| AWS | aws_wafv2_web_acl | WAFv2 Web ACL |
| AWS | aws_workspaces_workspace | WorkSpaces Workspace |
| Anthropic | anthropic_api_key | API Keys |
| Azure | azurerm_application_gateway | Application Gateway |
| Azure | azurerm_application_insights | Application Insights |
| Azure | azurerm_app_service_plan | App Service Plan |
| Azure | azurerm_firewall | Firewall |
| Azure | azurerm_snapshot | Snapshot |
| Azure | azurerm_container_registry | Container Registry |
| Azure | azurerm_cosmosdb_account | CosmosDB Account |
| Azure | azurerm_databricks_workspace | Databricks Workspace |
| Azure | azurerm_managed_disk | Managed Disk |
| Azure | azurerm_dns_zone | DNS Zone |
| Azure | azurerm_sql_elasticpool | SQL Elastic Pool |
| Azure | azurerm_express_route_circuit | ExpressRoute Circuit |
| Azure | azurerm_lb | Load Balancer |
| Azure | azurerm_log_analytics_workspace | Log Analytics Workspace |
| Azure | azurerm_logic_app_workflow | Logic App Workflow |
| Azure | azurerm_kubernetes_cluster | Kubernetes Cluster |
| Azure | azurerm_nat_gateway | NAT Gateway |
| Azure | azurerm_postgresql_flexible_server | PostgreSQL Flexible Server |
| Azure | azurerm_postgresql_server | PostgreSQL Server |
| Azure | azurerm_powerbi_dedicated_capacity | Power BI Dedicated Capacity |
| Azure | azurerm_private_endpoint | Private Endpoint |
| Azure | azurerm_public_ip | Public IP |
| Azure | azurerm_recovery_services_vault | Recovery Services Vault |
| Azure | azurerm_redis_cache | Redis Cache |
| Azure | azurerm_security_center_pricing | Security Center Pricing |
| Azure | azurerm_sql_database | SQL Database |
| Azure | azurerm_sql_managed_instance | SQL Managed Instance |
| Azure | azurerm_storage_account | Storage Account |
| Azure | azurerm_synapse_workspace | Synapse Workspace |
| Azure | azurerm_virtual_machine | Virtual Machine |
| Azure | azurerm_virtual_machine_scale_set | Virtual Machine Scale Set |
| Azure | azurerm_virtual_network_gateway | Virtual Network Gateway |
| ClickHouse Cloud | clickhouse_service | Services |
| Confluent | confluent_kafka_cluster | Kafka Cluster |
| Datadog | datadog_custom_metric | Custom Metric |
| Google | google_alloydb_backup | AlloyDB Backup |
| Google | google_alloydb_cluster | AlloyDB Cluster |
| Google | google_alloydb_instance | AlloyDB Instance |
| Google | google_app_engine_service | App Engine Service |
| Google | google_bigquery_dataset | BigQuery Dataset |
| Google | google_bigtable_instance | Bigtable Instance |
| Google | google_compute_disk | Compute Disk |
| Google | google_compute_instance | Compute Instance |
| Google | google_container_cluster | Container Cluster |
| Google | google_dataflow_job | Dataflow Job |
| Google | google_firestore_database | Firestore Database |
| Google | google_cloudfunctions_function | Cloud Functions Function |
| Google | google_logging_project_bucket_config | Logging Project Bucket Config |
| Google | google_redis_instance | Redis Instance |
| Google | google_cloud_run_service | Cloud Run Service |
| Google | google_secret_manager_secret | Secret Manager Secret |
| Google | google_spanner_instance | Spanner Instance |
| Google | google_sql_database_instance | SQL Database Instance |
| Google | google_storage_bucket | Storage Bucket |
| Kubernetes | kubernetes_workload | Kubernetes Workload |
| Linode | linode_instance | Instances |
| Linode | linode_node_balancer | Node Balancer |
| Linode | linode_node_balancer_type | Node Balancer Type |
| Linode | linode_volume | Volume |
| Linode | linode_volume_type | Volume Type |
| Linode | linode_object_storage | Object Storage |
| Linode | linode_linode_type | Linode Type |
| Linode | linode_object_storage_type | Object Storage Type |
| Linode | linode_kubernetes_cluster | Kubernetes Clusters |
| Linode | linode_kubernetes_type | Kubernetes Type |
| Linode | linode_image | Images |
| MongoDB | mongodbatlas_cluster | Atlas Cluster |
| PlanetScale | planetscale_database | Database |
| Snowflake | snowflake_query | Queries |
| Temporal | temporal_namespace | Namespaces |

### Resources by Label

Resources by specific label.

```sql
resources.provider = 'aws' AND resources.label = '123456'
```

### Resources for Specific ARN

The UUID is the unique identifier for the resource. In the case of AWS resources, this is the ARN. The below example shows a query for resources that contain specific text within the ARN.

```sql
resources.provider = 'aws' AND resources.uuid LIKE '%arn:aws:s3:::my-bucket%'
```

### Resources by Metadata

Resource metadata queries require both `provider` and `type` as well as `metadata`. Metadata uses a specific syntax (e.g., `resources.metadata->>'domain' = 'vantage.sh'`).

```sql
resources.provider = 'aws' AND (resources.type = 'aws_cloudfront_distribution' AND resources.metadata->>'domain' = 'vantage.sh')
```

### Filter by Tag

Filter resources based on a specific tag, such as `terraform`, with the value `true`, in AWS.

```sql
resources.provider = 'aws' AND (tags.name = 'terraform' AND tags.value = 'true')
```

### Filter for Untagged Resources

On providers that have a **Not Tagged** filter option in the console, you can use the below VQL to see untagged resources. This example looks for untagged resources in a multi-cloud environment.

```sql
(resources.provider = 'gcp' AND tags.name = NULL) OR (resources.provider = 'aws' AND tags.name = NULL)
```
