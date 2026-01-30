// This file is auto-generated. Do not edit directly. Run npm run generate-resources-index to update.

import wrapMap from "./bootstrapping/utils/wrapMap";

export default wrapMap(new Map([
    [
        "vql/cost_report.md",
        {
            content: `
## Cost Reports VQL Schema

VQL comprises two namespaces: \`costs\` and \`tags\`, which represent the available filters on Cost Reports in the Vantage console. To reference a filter, use the following syntax: \`namespace.field\` (e.g., \`costs.provider\` or \`tags.name\`).

| Namespace | Field | VQL Example |
| --- | --- | --- |
| \`costs\` | \`provider\` | [Providers example](#combining-providers) |
| \`costs\` | \`allocation\` | [Cost allocation example](#cost-allocation) |
| \`costs\` | \`region\` | [Region example](#costs-from-a-list-of-regions) |
| \`costs\` | \`marketplace\` | [Marketplace example](#get-marketplace-transactions) |
| \`costs\` | \`account_id\` | [Account ID example](#costs-by-account-id) |
| \`costs\` | \`provider_account_id\` | [Provider account ID example](#costs-by-provider-account-id) |
| \`costs\` | \`service\` | [Service example](#per-resource-costs-and-costs-by-service) |
| \`costs\` | \`category\` | [Category example](#costs-by-specific-category) |
| \`costs\` | \`subcategory\` | [Subcategory example](#costs-by-specific-subcategory) |
| \`costs\` | \`resource_id\` | [Resource example](#per-resource-costs-and-costs-by-service) |
| \`costs\` | \`charge_type\` | [Charge Type example](#cost-by-charge-type) |
| \`tags\` | \`name\` | [Tags name/value example](#filter-by-tag) |
| \`tags\` | \`value\` | [Untagged example](#filter-for-untagged-resources) |

> **Note:** Availability of the fields listed above varies among different cloud providers.

## Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| \`AND\` | Logical AND operator | \`costs.provider = 'aws' AND costs.service = 'EC2'\` | This example filters AWS costs for the EC2 service, where both conditions must be true. |
| \`OR\` | Logical OR operator | \`costs.provider = 'azure' OR costs.provider = 'aws'\` | This example retrieves costs from either Azure or AWS. At least one condition must be true. |
| \`IN\` | Used to compare against an array list | \`costs.provider = 'azure' AND costs.account_id IN ('account-1', 'account-2')\` | This example filters based on a list of account IDs, returning data for the specified accounts  <br /><br />    You can also use \`IN\` along with a special syntax for filtering by multiple tags. See [Filter by Multiple Tags](#filter-by-multiple-tags) for details. The \`IN\` keyword is not compatible for combining \`providers\`. |
| \`LIKE\` | Performs string comparisons | \`costs.provider = 'gcp' AND tags.name = 'environment' AND tags.value LIKE '%prod%'\` | This example selects data where the tag value contains \`prod\`, such as \`production-1\`. <br /><br />  Note that at this time, \`LIKE\` is not compatible with \`costs.account_id\`, \`costs.provider_account_id\`, \`costs.region\`, and \`costs.service\`. |
| \`NOT\` | Represents negation | \`costs.provider = 'aws' AND costs.region NOT IN ('us-east-1', 'us-east-2')\` | This example filters out data from both specified regions, providing all AWS costs *not* in these regions. Use \`NOT IN\` to specify a list of single or multiple values.   <br /><br />   You can also use the \`!=\` or \`<>\` operators for "is not."  <br /><br />    \`costs.provider = 'aws' AND costs.region != 'us-east-1'\`  <br /><br />    You can use \`NOT LIKE\` to perform string comparisons:   <br /><br />   \`costs.provider = 'gcp' AND tags.name = 'environment' AND tags.value NOT LIKE '%prod%'\` |
| \`~*\` | Flexible match operator for tag values | \`costs.provider = 'aws' AND (tags.name = 'teams' AND tags.value ~* 'Team A')\` | Searches for all items where the tag value loosely matches \`Team A\`, ignoring case, whitespace, hyphens, and punctuation. |
| \`!~*\` | Does not flexible match operator for tag values | \`costs.provider = 'aws' AND (tags.name = 'teams' AND tags.value !~* 'Team A')\` | Filters out all items where the tag value loosely matches \`Team A\`, ignoring case, whitespace, hyphens, and punctuation. |

With these keywords, you can construct complex filter conditions in VQL, providing flexibility and precision when querying and analyzing cloud cost data.

## Syntax

You can think of VQL in its current iteration as the \`WHERE\` clause of a SQL query. By combining the schema and keywords above with parentheses, you can form complex filter operations, such as:

\`\`\`vql
(costs.provider = 'mongo' AND costs.allocation = 1.0 AND (costs.service = 'REALM' AND costs.resource_id IN ('s3'))) OR (costs.provider = 'aws' AND costs.allocation = 1.0 AND costs.account_id IN ('123456798'))
\`\`\`

## VQL Examples

The following examples cover common use cases for VQL.

### Combining Providers

> **Note:** To reference a Custom Provider in VQL queries, navigate to the **Integrations** page in the Vantage console. Use the displayed **Provider ID** (e.g., \`custom_provider:accss_crdntl_123a45bfdaf38765\`).

Filter for provider costs associated with either MongoDB Atlas or AWS.

\`\`\`sql
costs.provider = 'mongo' OR costs.provider = 'aws'
\`\`\`

### Cost Allocation

Set cost allocation to \`0.5\`.

\`\`\`sql
costs.provider = 'gcp' AND costs.allocation = 0.5
\`\`\`

### Costs from a List of Regions

Filter for Snowflake costs in two regions. Note that you will need to use the region code, such as \`us-east-1\` in the case of AWS, or \`AWS_US_EAST_1\` in the case of Snowflake, below.

\`\`\`sql
costs.provider = 'snowflake' AND costs.region IN ('AWS_US_EAST_1', 'AWS_US_EAST_2')
\`\`\`

### Get Marketplace Transactions

Retrieve costs associated with the AWS Marketplace.

\`\`\`sql
costs.provider = 'aws' AND costs.marketplace = true
\`\`\`

### Costs by Account ID

Costs for a specific set of services and account ID.

\`\`\`sql
costs.provider = 'aws' AND costs.account_id = '123456758' AND costs.service IN ('Amazon Relational Database', 'Amazon Elastic Compute Cloud - Compute')
\`\`\`

### Costs by Provider Account ID

The following example represents costs from a specific AWS billing account or costs from a specific Azure subscription.

\`\`\`sql
(costs.provider = 'aws' AND costs.provider_account_id = 'abcd1234') OR (costs.provider = 'azure' AND costs.provider_account_id = 'abcd1234')
\`\`\`

### Per-Resource Costs and Costs by Service

Resource costs require both \`provider\` and \`service\` in addition to the \`resource_id\`.

\`\`\`sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
\`\`\`

#### Multiple Resource IDs

\`\`\`sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id IN ('arn:aws:rds:us-east-1:123456789:db:primary-01', 'arn:aws:rds:us-east-1:123456789:db:primary-02')
\`\`\`

### Costs by Specific Category

Filter costs to see a specific cost category. Category costs require both \`provider\` and \`service\` as well as \`category\`.

\`\`\`sql
costs.provider = 'fastly' AND costs.service = 'CDN' AND costs.category = 'Data Transfer'
\`\`\`

### Costs by Specific Subcategory

Filter costs by a specific service and subcategory. Subcategory costs require both \`provider\` and \`service\` as well as \`subcategory\`.

\`\`\`sql
costs.provider = 'aws' AND costs.service = 'AWS Certificate Manager' AND costs.subcategory = 'USE1-PaidPrivateCA'
\`\`\`

### Cost by Charge Type

Filter costs by a specific charge type.

\`\`\`sql
costs.provider = 'aws' AND costs.charge_type = 'Usage'
\`\`\`

### Filter by Tag

#### Filter by Single Tag

Filter costs based on a specific tag, such as \`environment\`, with the value \`production\`, in AWS.

\`\`\`sql
costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production'
\`\`\`

#### Filter for Multiple Values from a Single Tag Key

If you want to filter for multiple tag values that are tied to one tag key (e.g., costs tagged with the \`team\` tag of \`mobile\` and \`data\`), use the below syntax.

\`\`\`sql
costs.provider = 'aws' AND tags.name = 'team' AND tags.value IN ('mobile', 'data')
\`\`\`

#### Filter by Multiple Tags

If you want to filter for resources that have more than one tag associated, you can use the syntax shown in the example below.

\`\`\`sql
costs.provider = 'aws' AND (tags.name, tags.value) IN (('environment', 'staging'), ('team', 'engineering'))
\`\`\`

This example filters for resources that are tagged with the \`environment\` tag with a value of \`staging\` as well as the \`team\` tag with a value of \`engineering\`. This filter is the same as creating the following manual filter in the console.

![Filter by multiple tags in the console](https://assets.vantage.sh/docs/multiple-tags-example.png)

#### Filter for Matching Tags Using \`LIKE\`

\`\`\`sql
costs.provider = 'azure' AND (tags.name = 'environment' AND tags.value LIKE '%prod%')
\`\`\`

#### Filter for Tags Using Flexible Matching

\`\`\`sql
costs.provider = 'azure' AND (tags.name = 'Team' AND tags.value ~* 'Team A')
\`\`\`

Matches on applied tag values, such as \`TeamA\`, \`team-a\`, and \`team_a\` to a single \`Team A\` tag value.

### Filter for Untagged Resources

On providers that have a **Not Tagged**/**Not Labeled** filter option in the console, you can use the below VQL to see untagged resources. This example looks for untagged resources in a multi-cloud environment.

\`\`\`sql
(costs.provider = 'aws' AND tags.name = NULL) OR (costs.provider = 'azure' AND tags.name = NULL) OR (costs.provider = 'gcp' AND tags.name = NULL)
\`\`\`

## Troubleshooting

If you are receiving an error when trying to complete a query, check the following troubleshooting tips below.

- Each provider exposes certain field names. Those names are normalized within the schema.
- Query parameter values should be wrapped in single quotes.

**Example:**

✅ **THIS WORKS**

\`\`\`sql
costs.provider='aws'
\`\`\`

❌ **THIS DOES NOT WORK**

\`\`\`sql
costs.provider="aws"
\`\`\`

- Currently, there is a limitation where \`AND\` and \`OR\` are not supported together in a single "query group."

**Example:**

✅ **THIS WORKS**

\`\`\`sql
(costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'dev') OR (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'prod')
\`\`\`

❌ **THIS DOES NOT WORK**

\`\`\`sql
costs.provider = 'aws' AND ((tags.name = 'environment' AND tags.value = 'dev') OR (tags.name = 'environment' AND tags.value = 'prod'))
\`\`\`

- The \`costs.provider\` field is required on every call.

**Example:**

✅ **THIS WORKS**

\`\`\`sql
costs.provider = 'fastly' AND costs.service = 'CDN'
\`\`\`

❌ **THIS DOES NOT WORK**

\`\`\`sql
costs.service = 'CDN'
\`\`\`

- The \`costs.provider\` field is not compatible with the \`IN\` keyword.

**Example:**

✅ **THIS WORKS**

\`\`\`sql
(costs.provider = 'aws' AND costs.account_id IN ('123456789', '987654321')) OR (costs.provider = 'azure' AND costs.account_id IN ('account-1', 'account-2'))
\`\`\`

❌ **THIS DOES NOT WORK**

\`\`\`sql
costs.provider IN ('aws', 'azure')
\`\`\`

- Resource costs require both provider and service in addition to the resource ID.

**Example:**

✅ **THIS WORKS**

\`\`\`sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
\`\`\`

❌ **THIS DOES NOT WORK**

\`\`\`sql
costs.provider = 'aws' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
\`\`\`

- Category and subcategory costs also require provider and service.

**Examples:**

✅ **THESE WORK**

\`\`\`sql
costs.provider = 'fastly' AND costs.service = 'CDN' AND costs.category = 'Data Transfer'
\`\`\`

\`\`\`sql
costs.provider = 'aws' AND costs.service = 'AWS Certificate Manager' AND costs.subcategory = 'USE1-PaidPrivateCA'
\`\`\`

❌ **THESE DO NOT WORK**

\`\`\`sql
costs.provider = 'fastly' AND costs.category = 'Data Transfer'
\`\`\`

\`\`\`sql
costs.provider = 'aws' AND costs.subcategory = 'USE1-PaidPrivateCA'
\`\`\`
`,
            description: "Learn how to use VQL when querying Cost Reports in Vantage.",
            title: "VQL for Cost Reports",
        },
    ],
    [
        "vql/financial_commitment_report.md",
        {
            content: `
> **Tip:** If you need help constructing a VQL query, navigate to the **Financial Commitment Reports** page in the Vantage console and click **New Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Financial Commitment Reports VQL Schema

VQL for Financial Commitment Reports comprises one namespace, \`financial_commitments\`, which represents the available filters on Financial Commitment Reports in the Vantage console. To reference a filter, use the following syntax: \`namespace.field\` (e.g., \`financial_commitments.service\`). The following fields are available within the \`financial_commitments\` namespace.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| \`financial_commitments\` | \`provider\` | \`provider = 'aws'\` should be added as the first part of each statement |
| \`financial_commitments\` | \`service\` | [Service example](#financial-commitments-by-service) |
| \`financial_commitments\` | \`resource_account_id\` | [Account example](#financial-commitments-by-specific-account) |
| \`financial_commitments\` | \`provider_account_id\` | [Billing Account example](#financial-commitments-by-specific-billing-account) |
| \`financial_commitments\` | \`commitment_type\` | [Commitment Type example](#see-specific-commitment-types) |
| \`financial_commitments\` | \`commitment_id\` | [Commitment ARN example](#financial-commitments-by-commitment-arn) |
| \`financial_commitments\` | \`cost_type\` | [Charge Type example](#financial-commitments-by-charge-type) |
| \`financial_commitments\` | \`cost_category\` | [Category example](#financial-commitments-by-category) |
| \`financial_commitments\` | \`cost_sub_category\` | [Subcategory example](#financial-commitments-by-subcategory) |
| \`financial_commitments\` | \`instance_type\` | [Instance Type example](#financial-commitments-by-instance-types) |
| \`financial_commitments\` | \`region\` | [Region example](#financial-commitments-by-region) |
| \`financial_commitments\` | \`resource_tags\` | [Tags example](#financial-commitments-by-tags) |


### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents. Note that each expression started with \`provider = 'aws'\`, followed by additional filters.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| \`AND\` | Logical AND operator | \`(financial_commitments.provider = 'aws' AND (financial_commitments.resource_tags->>'business-metric' = 'us-east-1a') AND (financial_commitments.cost_category = 'Alarm'))\` | This example filters for a specific tag and category, where both conditions must be true. |
| \`OR\` | Logical OR operator | \`(financial_commitments.provider = 'aws' AND ((financial_commitments.resource_tags->>'business-metric' = 'us-east-1a') OR (financial_commitments.resource_tags->>'business-metric' = 'us-east-1b')))\` | This example looks for results where the \`business-metric\` tag has a value of either \`us-east-1a\` or \`us-east-1b\`. At least one condition must be true. |
| \`!=\` | Is not | \`(financial_commitments.provider = 'aws' AND (financial_commitments.cost_type != 'Credit'))\` | This example looks for results that are any charge type except for \`Credit\`. |
| \`IN\` and \`NOT IN\` | Used to compare against an array/list | \`(financial_commitments.provider = 'aws' AND (financial_commitments.resource_tags->>'business-metric' IN ('us-east-1a','us-east-1b','us-east-1c')))\` | This example searches for results with the \`business-metric\` tag key and multiple values.      This same query also works for \`NOT IN\` where the results are anything matching the tag key except for those particular values: \`(financial_commitments.provider = 'aws' AND (financial_commitments.resource_tags->>'business-metric' NOT IN ('us-east-1a','us-east-1b','us-east-1c')))\`. |
| \`LIKE\` and \`NOT LIKE\` | Performs string comparisons | \`(financial_commitments.provider = 'aws' AND (financial_commitments.commitment_id LIKE '%arn:aws:ec2%'))\` | This example selects data where the commitment ARN value contains \`arn:aws:ec2\`, such as \`arn:aws:ec2:us-west-2:1234\`.      This same query also works for \`NOT LIKE\` where data does not contain a particular string: \`(financial_commitments.provider = 'aws' AND (financial_commitments.commitment_id NOT LIKE '%arn:aws:ec2%'))\`. |
| \`->>\` | This operator is used only when constructing queries related to tags | \`(financial_commitments.provider = 'aws' AND (financial_commitments.resource_tags->>'environment' = 'staging'))\` | This example looks for results with the tag name of \`environment\` and value of \`staging\`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Financial Commitments by Service

Filter for multiple services.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.service IN ('AmazonAthena','AmazonCloudFront','AmazonECS')))
\`\`\`

### Financial Commitments by Specific Account

Filter down to an individual account.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.resource_account_id = '123456789012'))
\`\`\`

### Financial Commitments by Specific Billing Account

Filter down to an individual billing account.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.provider_account_id = '123456789012'))
\`\`\`

### See Specific Commitment Types

Filter out certain commitment types to see everything else.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.commitment_type NOT IN ('credit','free')))
\`\`\`

### Financial Commitments by Commitment ARN

See the impact of specific financial commitments related to EC2 by ARNs.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.commitment_id LIKE '%arn:aws:ec2%'))
\`\`\`

### Financial Commitments by Charge Type

See only usage-related commitments.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.cost_type = 'Usage'))
\`\`\`

### Financial Commitments by Category

All data transfer-related commitments.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.cost_category = 'Data Transfer'))
\`\`\`

### Financial Commitments by Subcategory

Filter for Cloudfront and data transfer egress in APN2.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.cost_sub_category IN ('APN2-DataTransfer-Out-Bytes','APN2-CloudFront-Out-Bytes')))
\`\`\`

### Financial Commitments by Instance Types

Filter from a list of different instance types.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.instance_type IN ('c7a.12xlarge','c7gn.large','c7gn.medium')))
\`\`\`

### Financial Commitments by Region

See all financial commitments in \`us-east-1\`.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.region = 'us-east-1'))
\`\`\`

### Financial Commitments by Tags

Filter based on a specific tag called \`business-metric\` and a list of provided values.

\`\`\`sql
(financial_commitments.provider = 'aws' AND (financial_commitments.resource_tags->>'business-metric' IN ('us-east-1a','us-east-1b','us-east-1c')))
\`\`\`

### Multiple Filters

Complex filter that shows combining two different statements using \`OR\` with multiple criteria.

\`\`\`sql
((financial_commitments.provider = 'aws' AND (financial_commitments.resource_account_id = '123456789012') AND (financial_commitments.service = 'AmazonEC2')) OR (financial_commitments.provider = 'aws' AND (financial_commitments.resource_account_id = '098765432109') AND (financial_commitments.service = 'AmazonRDS')))
\`\`\`
`,
            description: "Learn how to use VQL when querying Financial Commitment Reports in Vantage.",
            title: "VQL for Financial Commitment Reports",
        },
    ],
    [
        "vql/index.md",
        {
            content: `
# VQL (Vantage Query Language) Overview

The Vantage Query Language (VQL) is a SQL-like language for filtering cloud cost data. It includes a normalized schema across cloud providers and basic filter syntax for creating complex filters.

> **Tip:** On Cost, Resource, Kubernetes Efficiency, Financial Commitment, and Network Flow Reports, you can create a filter and click **View as VQL** to see the filter represented in VQL.
>
> ![Show as VQL button on a Cost Report](https://assets.vantage.sh/docs/show-as-vql.png)

The below examples show how to use VQL. This example creates a saved filter in your Vantage account using VQL.

## Example

\`\`\`json
{
  "filter": "(costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service') OR (costs.provider = 'gcp' AND costs.service = 'Cloud SQL')",
  "title": "RDS and Cloud SQL",
  "workspace_token": "wrkspc_abcde12345"
}
\`\`\`

VQL is based on the following key concepts, further described in subsequent sections.

### Schema

VQL uses a schema that organizes filters into namespaces. These namespaces comprise various fields that you can leverage to filter and retrieve specific cost-related data.

### Keywords

VQL includes keywords, like \`AND\`, \`OR\`, \`IN\`, \`LIKE\`, and \`NOT\`, to create complex and precise filter conditions. These keywords vary per report type/scope.

### Syntax

VQL syntax closely resembles the \`WHERE\` clause of a SQL query. You can construct filter operations to extract desired cost insights.

## Scopes

VQL has a separate scope for each type of report—meaning that you cannot use VQL statements for Cost Reports when querying Resource Reports. See the following pages below to learn more about each VQL scope.

- [VQL for Cost Reports](file://vantage/vql/cost_report.md)
- [VQL for Resource Reports](file://vantage/vql/resource_report.md)
- [VQL for Kubernetes Efficiency Reports](file://vantage/vql/kubernetes_efficiency_report.md)
- [VQL for Financial Commitment Reports](file://vantage/vql/financial_commitment_report.md)
- [VQL for Network Flow Reports](file://vantage/vql/network_flow_report.md)
`,
            description: "Learn Vantage Query Language (VQL), a SQL-like language for filtering cloud cost data across providers.",
            title: "VQL (Vantage Query Language) Overview",
        },
    ],
    [
        "vql/kubernetes_efficiency_report.md",
        {
            content: `
> **Tip:** If you need help constructing a VQL query, navigate to the **Kubernetes Efficiency Reports** page in the Vantage console and click **New Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Kubernetes Efficiency Reports VQL Schema

VQL for Kubernetes Efficiency Reports comprises one namespace, \`kubernetes\`, which represents the available filters on Kubernetes Efficiency Reports in the Vantage console. To reference a filter, use the following syntax: \`namespace.field\` (e.g., \`kubernetes.category\`). The following fields are available within the \`kubernetes\` namespace.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| \`kubernetes\` | \`namespace\` | [Namespace example](#multiple-namespaces) |
| \`kubernetes\` | \`cluster_id\` | [Cluster ID example](#results-from-a-list-of-clusters) |
| \`kubernetes\` | \`category\` | [Category example](#costs-by-category) |
| \`kubernetes\` | \`labels\` | [Labels example](#filter-by-label) |
| \`kubernetes\` | \`pod\` | [Pod example](#filter-by-pod) |

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| \`AND\` | Logical AND operator | \`(kubernetes.namespace = 'kube-system') AND (kubernetes.labels->>'app' = 'vantage-agent')\` | This example filters for a specific namespace and label, where both conditions must be true. |
| \`OR\` | Logical OR operator | \`(kubernetes.namespace = 'gpu-operator') OR (kubernetes.namespace = 'vantage-dev')\` | This example looks for results in two different namespaces. At least one condition must be true. |
| \`!=\` | Is not | \`(kubernetes.cluster_id != 'dev-eks-gpu-0')\` | This example looks for results that are in any cluster except for \`dev-eks-gpu-0\`. |
| \`IN\` and \`NOT IN\` | Used to compare against an array/list | \`(kubernetes.labels->>'app.kubernetes.io/component' IN ('csi-driver','gpu-operator','metrics'))\` | This example searches for results with the \`app.kubernetes.io/component\` key and multiple values.      This same query also works for \`NOT IN\` where the results are anything matching the label key except for those particular values: \`(kubernetes.labels->>'app.kubernetes.io/component' NOT IN ('csi-driver','gpu-operator','metrics'))\`. |
| \`LIKE\` and \`NOT LIKE\` | Performs string comparisons | \`(kubernetes.labels->>'app' LIKE '%test%')\` | This example selects data where the \`app\` label value contains \`test\`, such as \`test-app\`.      This same query also works for \`NOT LIKE\` where data does not contain a particular string: \`(kubernetes.labels->>'app' NOT LIKE '%test%')\`. |
| \`->>\` | This operator is used only when constructing queries related to labels | \`(kubernetes.labels->>'container' = 'kube-prometheus-stack-48.4.0')\` | This example looks for results with the label name of \`container\` and value of \`kube-prometheus-stack-48.4.0\`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Multiple Namespaces

Filter for one or the other namespace.

\`\`\`sql
(kubernetes.namespace = 'kube-system') OR (kubernetes.namespace = 'default')
\`\`\`

### Results from a List of Clusters

Filter for a list of different clusters.

\`\`\`sql
(kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN'))
\`\`\`

### Costs by Category

Costs for a specific category, like \`cpu\`.

\`\`\`sql
(kubernetes.category = 'cpu')
\`\`\`

### Filter by Label

Filter based on a specific Kubernetes label, such as \`app\`, with the value \`rollouts-demo\`.

\`\`\`sql
(kubernetes.labels->>'app' = 'rollouts-demo')
\`\`\`

### Filter by Pod

Filter for a specific pod.

\`\`\`sql
(kubernetes.pod = 'my-pod-name')
\`\`\`

### Multiple Filters

Complex filter that shows combining two different statements using \`OR\` with multiple criteria.

\`\`\`sql
((kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN')) AND (kubernetes.category = 'cpu')) OR ((kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN')) AND (kubernetes.category = 'gpu'))
\`\`\`
`,
            description: "Learn how to use VQL when querying Kubernetes Efficiency Reports in Vantage.",
            title: "VQL for Kubernetes Efficiency Reports",
        },
    ],
    [
        "vql/network_flow_report.md",
        {
            content: `
> **Tip:** If you need help constructing a VQL query, navigate to the **Network Flow Reports** page in the Vantage console and click **New Network Flow Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Network Flow Reports VQL Schema

VQL for Network Flow Reports comprises one namespace, \`network_flow_logs\`, which represents the available filters on Network Flow Reports in the Vantage console. To reference a filter, use the following syntax: \`namespace.field\` (e.g., \`network_flow_logs.account_id\`). The following fields are available within the \`network_flow_logs\` namespace.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| \`network_flow_logs\` | \`account_id\` | [Account ID example](#network-flows-by-account-id) |
| \`network_flow_logs\` | \`az_id\` | [Availability Zone ID example](#network-flows-by-availability-zone-id) |
| \`network_flow_logs\` | \`dstaddr\` | [Destination Address example](#network-flows-by-destination-address) |
| \`network_flow_logs\` | \`dsthostname\` | [Destination Hostname example](#network-flows-by-destination-hostname) |
| \`network_flow_logs\` | \`interface_id\` | [Interface ID example](#network-flows-by-interface-id) |
| \`network_flow_logs\` | \`instance_id\` | [Instance ID example](#network-flows-by-instance-id) |
| \`network_flow_logs\` | \`peer_resource_uuid\` | [Peer Resource UUID example](#network-flows-by-peer-resource-uuid) |
| \`network_flow_logs\` | \`peer_account_id\` | [Peer Account ID example](#network-flows-by-peer-account-id) |
| \`network_flow_logs\` | \`peer_vpc_id\` | [Peer VPC ID example](#network-flows-by-peer-vpc-id) |
| \`network_flow_logs\` | \`peer_regions\` | [Peer Regions example](#network-flows-by-peer-regions) |
| \`network_flow_logs\` | \`peer_az_id\` | [Peer AZ ID example](#network-flows-by-peer-az-id) |
| \`network_flow_logs\` | \`peer_subnet_id\` | [Peer Subnet ID example](#network-flows-by-peer-subnet-id) |
| \`network_flow_logs\` | \`peer_interface_id\` | [Peer Interface ID example](#network-flows-by-peer-interface-id) |
| \`network_flow_logs\` | \`peer_instance_id\` | [Peer Instance ID example](#network-flows-by-peer-instance-id) |
| \`network_flow_logs\` | \`region\` | [Region example](#network-flows-by-region) |
| \`network_flow_logs\` | \`resource_uuid\` | [Resource UUID example](#network-flows-by-resource-uuid) |
| \`network_flow_logs\` | \`srcaddr\` | [Source Address example](#network-flows-by-source-address) |
| \`network_flow_logs\` | \`srchostname\` | [Source Hostname example](#network-flows-by-source-hostname) |
| \`network_flow_logs\` | \`subnet_id\` | [Subnet ID example](#network-flows-by-subnet-id) |
| \`network_flow_logs\` | \`traffic_category\` | [Traffic Category example](#network-flows-by-traffic-category) |
| \`network_flow_logs\` | \`traffic_path\` | [Traffic Path example](#network-flows-by-traffic-path) |
| \`network_flow_logs\` | \`vpc_id\` | [VPC ID example](#network-flows-by-vpc-id) |

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| \`AND\` | Logical AND operator | \`(network_flow_logs.account_id = '123456789012') AND (network_flow_logs.dsthostname = 'datadoghq.com')\` | This example filters for a specific account and destination hostname, where both conditions must be true. |
| \`OR\` | Logical OR operator | \`((network_flow_logs.account_id = '123456789012') AND (network_flow_logs.dsthostname = 'datadoghq.com')) OR ((network_flow_logs.account_id = '09876543212') AND (network_flow_logs.dsthostname = 'github.com'))\` | This example looks for results associated with two accounts and destination hostnames. At least one condition must be true. |
| \`!=\` | Is not | \`(network_flow_logs.dsthostname != 'github.com')\` | This example looks for results that are any destination hostname type except for \`github.com\`. |
| \`IN\` and \`NOT IN\` | Used to compare against an array/list | \`(network_flow_logs.peer_regions IN ('us-east-1','us-west-2'))\` | This example searches for results within a set of regions.      This same query also works for \`NOT IN\` where the results are anything matching everything except for these regions: \`(network_flow_logs.peer_regions NOT IN ('us-east-1','us-west-2'))\`. |
| \`LIKE\` and \`NOT LIKE\` | Performs string comparisons | \`(network_flow_logs.az_id LIKE '%use1%')\` | This example selects data where the Availability Zone contains \`use1\`, such as \`use1-az1\`.      This same query also works for \`NOT LIKE\` where data does not contain a particular string: \`(network_flow_logs.az_id NOT LIKE '%use1%')\`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Network Flows by Account ID

Network flows from a set of account IDs.

\`\`\`sql
(network_flow_logs.account_id IN ('123456789012','098765432109'))
\`\`\`

### Network Flows by Availability Zone ID

Filter for a substring based on Availability Zone.

\`\`\`sql
(network_flow_logs.az_id LIKE '%use1%')
\`\`\`

### Network Flows by Destination Address

All network flows that do not match a particular destination address.

\`\`\`sql
(network_flow_logs.dstaddr != '1.123.456.7')
\`\`\`

### Network Flows by Destination Hostname

Network flows from a set of destination hostnames.

\`\`\`sql
(network_flow_logs.dsthostname IN ('datadoghq.com','github.com','sentry.io'))
\`\`\`

### Network Flows by Interface ID

Network flows for a particular interface ID.

\`\`\`sql
(network_flow_logs.interface_id = 'eni-000012345a6789123')
\`\`\`

### Network Flows by Instance ID

Network flows for a particular instance ID.

\`\`\`sql
(network_flow_logs.instance_id = 'i-0001a23b456c780c1')
\`\`\`

### Network Flows by Peer Resource UUID

Network flows for peer resource UUIDs matching a substring.

\`\`\`sql
(network_flow_logs.peer_resource_uuid LIKE '%arn:aws:ec2%')
\`\`\`

### Network Flows by Peer Account ID

Network flows for anything that's not a particular peer account ID.

\`\`\`sql
(network_flow_logs.peer_account_id != '123456789012')
\`\`\`

### Network Flows by Peer VPC ID

Network flows for two different peer VPC IDs.

\`\`\`sql
(network_flow_logs.peer_vpc_id IN ('vpc-12345678','vpc-0987654'))
\`\`\`

### Network Flows by Peer Regions

Network flows for anything outside a set of peer regions.

\`\`\`sql
(network_flow_logs.peer_regions NOT IN ('us-east-1','us-west-2'))
\`\`\`

### Network Flows by Peer AZ ID

Network flows for a specific peer AZ.

\`\`\`sql
(network_flow_logs.peer_az_id = 'use1-az1')
\`\`\`

### Network Flows by Peer Subnet ID

Network flows for any peer subnet IDs that do not contain a substring.

\`\`\`sql
(network_flow_logs.peer_subnet_id NOT LIKE '%subnet-022%')
\`\`\`

### Network Flows by Peer Interface ID

Network flows based on a peer interface ID substring.

\`\`\`sql
(network_flow_logs.peer_interface_id LIKE 'eni-0a1b2c3d%')
\`\`\`

### Network Flows by Peer Instance ID

Network flows excluding a particular peer instance ID.

\`\`\`sql
(network_flow_logs.peer_instance_id != 'i-0a1b2c3d4e5f67890')
\`\`\`

### Network Flows by Region

Network flows in multiple regions.

\`\`\`sql
(network_flow_logs.region IN ('us-east-1', 'us-west-2', 'eu-central-1'))
\`\`\`

### Network Flows by Resource UUID

Network flows for resources not matching a specific UUID substring.

\`\`\`sql
(network_flow_logs.resource_uuid NOT LIKE '123e4567%')
\`\`\`

### Network Flows by Source Address

Network flows from a set of source addresses.

\`\`\`sql
(network_flow_logs.srcaddr IN ('192.168.1.1', '10.0.0.5', '172.16.0.10'))
\`\`\`

### Network Flows by Source Hostname

Network flows excluding specific source hostnames.

\`\`\`sql
(network_flow_logs.srchostname NOT IN ('example.com', 'internal.service.local'))
\`\`\`

### Network Flows by Subnet ID

Network flows for subnets with a specific prefix.

\`\`\`sql
(network_flow_logs.subnet_id LIKE 'subnet-0a1b%')
\`\`\`

### Network Flows by Traffic Category

Only cross-region traffic.

\`\`\`sql
(network_flow_logs.traffic_category = 'cross-region')
\`\`\`

### Network Flows by Traffic Path

Network flows for Inter-Region VPC Peering. Traffic paths have a specific key, as described below.

| Key | Traffic Path |
| --- | --- |
| 1 | In VPC |
| 2 | Internet Gateway or Gateway VPC Endpoint |
| 3 | Virtual Private Gateway |
| 4 | Intra-Region VPC Peering |
| 5 | Inter-Region VPC Peering |
| 6 | Local Gateway |
| 7 | Gateway VPC Endpoint (Nitro-based instances) |
| 8 | Internet Gateway (Nitro-based instances) |

\`\`\`sql
(network_flow_logs.traffic_path = '5')
\`\`\`

### Network Flows by VPC ID

Everything except for a specific VPC.

\`\`\`sql
(network_flow_logs.vpc_id != 'vpc-12c12345a12345678')
\`\`\`

### Multiple Filters

Complex filter that shows combining two different statements using \`OR\` with multiple criteria.

\`\`\`sql
((network_flow_logs.dsthostname = 'datadoghq.com') AND (network_flow_logs.account_id = '1234354678901')) OR ((network_flow_logs.dsthostname = 'github.com') AND (network_flow_logs.account_id = '90876543211'))
\`\`\`
`,
            description: "Learn how to use VQL when querying Network Flow Reports in Vantage.",
            title: "VQL for Network Flow Reports",
        },
    ],
    [
        "vql/resource_report.md",
        {
            content: `
> **Tip:** If you need help constructing a VQL query, navigate to the **Resource Reports** page in the Vantage console and click **New Resource Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Resource Reports VQL Schema

VQL for Resources Reports comprises two namespaces: \`resources\` and \`tags\`, which represent the available filters on Resource Reports in the Vantage console. To reference a filter, use the following syntax: \`namespace.field\` (e.g., \`resources.region\` or \`tags.name\`). The following fields are available within these namespaces.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| \`resources\` | \`provider\` | [Providers example](#combining-providers) |
| \`resources\` | \`region\` | [Region example](#resources-from-a-list-of-regions) |
| \`resources\` | \`account_id\` | [Account example](#resources-by-account-id) |
| \`resources\` | \`provider_account_id\` | [Billing Account example](#resources-by-billing-account) |
| \`resources\` | \`type\` | [Resource Type example](#resources-by-resource-type) |
| \`resources\` | \`label\` | [Label example](#resources-by-label) |
| \`resources\` | \`uuid\` | [UUID (AWS ARN) example](#resources-for-specific-arn) |
| \`resources\` | \`metadata\` | [Metadata example](#resources-by-metadata) |
| \`tags\` | \`name\` | [Tags name/value example](#filter-by-tag) |
| \`tags\` | \`value\` | [Untagged example](#filter-for-untagged-resources) |

> **Note:** Availability of the fields listed above varies among different cloud providers.

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| \`AND\` | Logical AND operator | \`resources.provider = 'aws' AND resources.label = '123456'\` | This example filters AWS resources, with a specific associated label, where both conditions must be true. |
| \`OR\` | Logical OR operator | \`(resources.provider = 'aws') OR (resources.provider = 'gcp')\` | This example retrieves resources from either AWS or GCP. At least one condition must be true. |
| \`LIKE\` and \`NOT LIKE\` | Performs string comparisons | \`resources.provider = 'aws' AND resources.uuid LIKE '%arn:aws:s3:::my-bucket%'\` | This example selects data where the resource ARN contains \`arn:aws:s3:::my-bucket\`, such as \`arn:aws:s3:::my-bucket-123\`.  <br /><br />     This same query also works for \`NOT LIKE\` where data does not contain a particular string: \`resources.provider = 'aws' AND resources.uuid NOT LIKE '%arn:aws:s3:::my-bucket%'\`. |
| \`IN\`/\`NOT IN\` | Used to compare against an array list | \`(resources.provider = 'aws' AND (resources.region IN ('ap-northeast-1','ap-northeast-3')))\` | This example filters based on a list of regions, returning data for the specified regions  <br /><br />     You can also use \`NOT IN\` to find results that are anything but the items within the list: \`(resources.provider = 'aws' AND (resources.region NOT IN ('ap-northeast-1','ap-northeast-3')))\` |
| \`!=\` | Represents negation, "is not" | \`resources.provider = 'azure' AND (resources.type != 'azurerm_public_ip' AND resources.type != 'azurerm_kubernetes_cluster')\` | This example filters out data from two specified resource types, providing all Azure resources that are *not* these types. |
| \`<\`, \`>\`, \`<=\`, \`>=\` | Mathematical operators for numerical queries | \`resources.provider = 'azure' AND (resources.type = 'azurerm_virtual_machine' AND resources.metadata->>'virtual_machine_size' > '7')\` | This example looks for Virtual Machines that have a size greater than 7. |
| \`->>\` | This operator is used only when constructing queries related to metadata | \`resources.provider = 'aws' AND (resources.type = 'aws_instance' AND resources.metadata->>'architecture' = 'x86_64')\` | This example looks for EC2 instances with an architecture of \`x86_64\`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Combining Providers

Filter for provider resources associated with either AWS or GCP.

\`\`\`sql
(resources.provider = 'aws') OR (resources.provider = 'gcp')
\`\`\`

### Resources from a List of Regions

Filter for AWS resources in two regions. Note that you will need to use the region code, such as \`us-east-1\`.

\`\`\`sql
resources.provider = 'aws' AND (resources.region = 'us-east-1' OR resources.region = 'us-west-1')
\`\`\`

### Resources by Account ID

Resources for a specific set of resource types and account ID.

\`\`\`sql
resources.provider = 'gcp' AND (resources.account_id = 'user-proj-1234') AND (resources.type = 'google_compute_disk' OR resources.type = 'google_compute_instance')
\`\`\`

### Resources by Billing Account

Resources for a specific billing account.

\`\`\`sql
resources.provider = 'aws' AND (resources.provider_account_id = '11111111111')
\`\`\`

### Resources by Resource Type

Filter resources to see a specific resource type. In the example below, the query is looking for any AWS resource that is *not* an AWS CloudFront Distribution. Resource types are represented like \`aws_cloudfront_distribution\`.

\`\`\`sql
resources.provider = 'aws' AND (resources.type != 'aws_cloudfront_distribution')
\`\`\`

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

\`\`\`sql
resources.provider = 'aws' AND resources.label = '123456'
\`\`\`

### Resources for Specific ARN

The UUID is the unique identifier for the resource. In the case of AWS resources, this is the ARN. The below example shows a query for resources that contain specific text within the ARN.

\`\`\`sql
resources.provider = 'aws' AND resources.uuid LIKE '%arn:aws:s3:::my-bucket%'
\`\`\`

### Resources by Metadata

Resource metadata queries require both \`provider\` and \`type\` as well as \`metadata\`. Metadata uses a specific syntax (e.g., \`resources.metadata->>'domain' = 'vantage.sh'\`).

\`\`\`sql
resources.provider = 'aws' AND (resources.type = 'aws_cloudfront_distribution' AND resources.metadata->>'domain' = 'vantage.sh')
\`\`\`

### Filter by Tag

Filter resources based on a specific tag, such as \`terraform\`, with the value \`true\`, in AWS.

\`\`\`sql
resources.provider = 'aws' AND (tags.name = 'terraform' AND tags.value = 'true')
\`\`\`

### Filter for Untagged Resources

On providers that have a **Not Tagged** filter option in the console, you can use the below VQL to see untagged resources. This example looks for untagged resources in a multi-cloud environment.

\`\`\`sql
(resources.provider = 'gcp' AND tags.name = NULL) OR (resources.provider = 'aws' AND tags.name = NULL)
\`\`\`
`,
            description: "Learn how to use VQL when querying Resource Reports in Vantage.",
            title: "VQL for Resource Reports",
        },
    ],
]));
