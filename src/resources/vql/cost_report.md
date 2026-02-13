---
title: "VQL for Cost Reports"
description: "Learn how to use VQL when querying Cost Reports in Vantage."
---

## Cost Reports VQL Schema

VQL comprises two namespaces: `costs` and `tags`, which represent the available filters on Cost Reports in the Vantage console. To reference a filter, use the following syntax: `namespace.field` (e.g., `costs.provider` or `tags.name`).

| Namespace | Field | VQL Example |
| --- | --- | --- |
| `costs` | `provider` | [Providers example](#combining-providers) |
| `costs` | `allocation` | [Cost allocation example](#cost-allocation) |
| `costs` | `region` | [Region example](#costs-from-a-list-of-regions) |
| `costs` | `marketplace` | [Marketplace example](#get-marketplace-transactions) |
| `costs` | `account_id` | [Account ID example](#costs-by-account-id) |
| `costs` | `provider_account_id` | [Provider account ID example](#costs-by-provider-account-id) |
| `costs` | `service` | [Service example](#per-resource-costs-and-costs-by-service) |
| `costs` | `category` | [Category example](#costs-by-specific-category) |
| `costs` | `subcategory` | [Subcategory example](#costs-by-specific-subcategory) |
| `costs` | `resource_id` | [Resource example](#per-resource-costs-and-costs-by-service) |
| `costs` | `charge_type` | [Charge Type example](#cost-by-charge-type) |
| `tags` | `name` | [Tags name/value example](#filter-by-tag) |
| `tags` | `value` | [Untagged example](#filter-for-untagged-resources) |

> **Note:** Availability of the fields listed above varies among different cloud providers.

## Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| `AND` | Logical AND operator | `costs.provider = 'aws' AND costs.service = 'EC2'` | This example filters AWS costs for the EC2 service, where both conditions must be true. |
| `OR` | Logical OR operator | `costs.provider = 'azure' OR costs.provider = 'aws'` | This example retrieves costs from either Azure or AWS. At least one condition must be true. |
| `IN` | Used to compare against an array list | `costs.provider = 'azure' AND costs.account_id IN ('account-1', 'account-2')` | This example filters based on a list of account IDs, returning data for the specified accounts  <br /><br />    You can also use `IN` along with a special syntax for filtering by multiple tags. See [Filter by Multiple Tags](#filter-by-multiple-tags) for details. The `IN` keyword is not compatible for combining `providers`. |
| `LIKE` | Performs string comparisons | `costs.provider = 'gcp' AND tags.name = 'environment' AND tags.value LIKE '%prod%'` | This example selects data where the tag value contains `prod`, such as `production-1`. <br /><br />  Note that at this time, `LIKE` is not compatible with `costs.account_id`, `costs.provider_account_id`, `costs.region`, and `costs.service`. |
| `NOT` | Represents negation | `costs.provider = 'aws' AND costs.region NOT IN ('us-east-1', 'us-east-2')` | This example filters out data from both specified regions, providing all AWS costs *not* in these regions. Use `NOT IN` to specify a list of single or multiple values.   <br /><br />   You can also use the `!=` or `<>` operators for "is not."  <br /><br />    `costs.provider = 'aws' AND costs.region != 'us-east-1'`  <br /><br />    You can use `NOT LIKE` to perform string comparisons:   <br /><br />   `costs.provider = 'gcp' AND tags.name = 'environment' AND tags.value NOT LIKE '%prod%'` |
| `~*` | Flexible match operator for tag values | `costs.provider = 'aws' AND (tags.name = 'teams' AND tags.value ~* 'Team A')` | Searches for all items where the tag value loosely matches `Team A`, ignoring case, whitespace, hyphens, and punctuation. |
| `!~*` | Does not flexible match operator for tag values | `costs.provider = 'aws' AND (tags.name = 'teams' AND tags.value !~* 'Team A')` | Filters out all items where the tag value loosely matches `Team A`, ignoring case, whitespace, hyphens, and punctuation. |

With these keywords, you can construct complex filter conditions in VQL, providing flexibility and precision when querying and analyzing cloud cost data.

## Syntax

You can think of VQL in its current iteration as the `WHERE` clause of a SQL query. By combining the schema and keywords above with parentheses, you can form complex filter operations, such as:

```vql
(costs.provider = 'mongo' AND costs.allocation = 1.0 AND (costs.service = 'REALM' AND costs.resource_id IN ('s3'))) OR (costs.provider = 'aws' AND costs.allocation = 1.0 AND costs.account_id IN ('123456798'))
```

## VQL Examples

The following examples cover common use cases for VQL.

### Combining Providers

> **Note:** To reference a Custom Provider in VQL queries, navigate to the **Integrations** page in the Vantage console. Use the displayed **Provider ID** (e.g., `custom_provider:accss_crdntl_123a45bfdaf38765`).

Filter for provider costs associated with either MongoDB Atlas or AWS.

```sql
costs.provider = 'mongo' OR costs.provider = 'aws'
```

### Cost Allocation

Set cost allocation to `0.5`.

```sql
costs.provider = 'gcp' AND costs.allocation = 0.5
```

### Costs from a List of Regions

Filter for Snowflake costs in two regions. Note that you will need to use the region code, such as `us-east-1` in the case of AWS, or `AWS_US_EAST_1` in the case of Snowflake, below.

```sql
costs.provider = 'snowflake' AND costs.region IN ('AWS_US_EAST_1', 'AWS_US_EAST_2')
```

### Get Marketplace Transactions

Retrieve costs associated with the AWS Marketplace.

```sql
costs.provider = 'aws' AND costs.marketplace = true
```

### Costs by Account ID

Costs for a specific set of services and account ID.

```sql
costs.provider = 'aws' AND costs.account_id = '123456758' AND costs.service IN ('Amazon Relational Database', 'Amazon Elastic Compute Cloud - Compute')
```

### Costs by Provider Account ID

The following example represents costs from a specific AWS billing account or costs from a specific Azure subscription.

```sql
(costs.provider = 'aws' AND costs.provider_account_id = 'abcd1234') OR (costs.provider = 'azure' AND costs.provider_account_id = 'abcd1234')
```

### Per-Resource Costs and Costs by Service

Resource costs require both `provider` and `service` in addition to the `resource_id`.

```sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
```

#### Multiple Resource IDs

```sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id IN ('arn:aws:rds:us-east-1:123456789:db:primary-01', 'arn:aws:rds:us-east-1:123456789:db:primary-02')
```

### Costs by Specific Category

Filter costs to see a specific cost category. Category costs require both `provider` and `service` as well as `category`.

```sql
costs.provider = 'fastly' AND costs.service = 'CDN' AND costs.category = 'Data Transfer'
```

### Costs by Specific Subcategory

Filter costs by a specific service and subcategory. Subcategory costs require both `provider` and `service` as well as `subcategory`.

```sql
costs.provider = 'aws' AND costs.service = 'AWS Certificate Manager' AND costs.subcategory = 'USE1-PaidPrivateCA'
```

### Cost by Charge Type

Filter costs by a specific charge type.

```sql
costs.provider = 'aws' AND costs.charge_type = 'Usage'
```

### Filter by Tag

#### Filter by Single Tag

Filter costs based on a specific tag, such as `environment`, with the value `production`, in AWS.

```sql
costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'production'
```

#### Filter for Multiple Values from a Single Tag Key

If you want to filter for multiple tag values that are tied to one tag key (e.g., costs tagged with the `team` tag of `mobile` and `data`), use the below syntax.

```sql
costs.provider = 'aws' AND tags.name = 'team' AND tags.value IN ('mobile', 'data')
```

#### Filter by Multiple Tags

If you want to filter for resources that have more than one tag associated, you can use the syntax shown in the example below.

```sql
costs.provider = 'aws' AND (tags.name, tags.value) IN (('environment', 'staging'), ('team', 'engineering'))
```

This example filters for resources that are tagged with the `environment` tag with a value of `staging` as well as the `team` tag with a value of `engineering`. This filter is the same as creating the following manual filter in the console.

![Filter by multiple tags in the console](https://assets.vantage.sh/docs/multiple-tags-example.png)

#### Filter for Matching Tags Using `LIKE`

```sql
costs.provider = 'azure' AND (tags.name = 'environment' AND tags.value LIKE '%prod%')
```

#### Filter for Tags Using Flexible Matching

```sql
costs.provider = 'azure' AND (tags.name = 'Team' AND tags.value ~* 'Team A')
```

Matches on applied tag values, such as `TeamA`, `team-a`, and `team_a` to a single `Team A` tag value.

### Filter for Untagged Resources

On providers that have a **Not Tagged**/**Not Labeled** filter option in the console, you can use the below VQL to see untagged resources. This example looks for untagged resources in a multi-cloud environment.

```sql
(costs.provider = 'aws' AND tags.name = NULL) OR (costs.provider = 'azure' AND tags.name = NULL) OR (costs.provider = 'gcp' AND tags.name = NULL)
```

## Troubleshooting

If you are receiving an error when trying to complete a query, check the following troubleshooting tips below.

- Each provider exposes certain field names. Those names are normalized within the schema.
- Query parameter values should be wrapped in single quotes.

**Example:**

✅ **THIS WORKS**

```sql
costs.provider='aws'
```

❌ **THIS DOES NOT WORK**

```sql
costs.provider="aws"
```

- Currently, there is a limitation where `AND` and `OR` are not supported together in a single "query group."

**Example:**

✅ **THIS WORKS**

```sql
(costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'dev') OR (costs.provider = 'aws' AND tags.name = 'environment' AND tags.value = 'prod')
```

❌ **THIS DOES NOT WORK**

```sql
costs.provider = 'aws' AND ((tags.name = 'environment' AND tags.value = 'dev') OR (tags.name = 'environment' AND tags.value = 'prod'))
```

- The `costs.provider` field is required on every call.

**Example:**

✅ **THIS WORKS**

```sql
costs.provider = 'fastly' AND costs.service = 'CDN'
```

❌ **THIS DOES NOT WORK**

```sql
costs.service = 'CDN'
```

- The `costs.provider` field is not compatible with the `IN` keyword.

**Example:**

✅ **THIS WORKS**

```sql
(costs.provider = 'aws' AND costs.account_id IN ('123456789', '987654321')) OR (costs.provider = 'azure' AND costs.account_id IN ('account-1', 'account-2'))
```

❌ **THIS DOES NOT WORK**

```sql
costs.provider IN ('aws', 'azure')
```

- Resource costs require both provider and service in addition to the resource ID.

**Example:**

✅ **THIS WORKS**

```sql
costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
```

❌ **THIS DOES NOT WORK**

```sql
costs.provider = 'aws' AND costs.resource_id = 'arn:aws:rds:us-east-1:123456789:db:primary-01'
```

- Category and subcategory costs also require provider and service.

**Examples:**

✅ **THESE WORK**

```sql
costs.provider = 'fastly' AND costs.service = 'CDN' AND costs.category = 'Data Transfer'
```

```sql
costs.provider = 'aws' AND costs.service = 'AWS Certificate Manager' AND costs.subcategory = 'USE1-PaidPrivateCA'
```

❌ **THESE DO NOT WORK**

```sql
costs.provider = 'fastly' AND costs.category = 'Data Transfer'
```

```sql
costs.provider = 'aws' AND costs.subcategory = 'USE1-PaidPrivateCA'
```
