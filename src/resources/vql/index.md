---
title: VQL (Vantage Query Language) Overview
description: "Learn Vantage Query Language (VQL), a SQL-like language for filtering cloud cost data across providers."
---

# VQL (Vantage Query Language) Overview

The Vantage Query Language (VQL) is a SQL-like language for filtering cloud cost data. It includes a normalized schema across cloud providers and basic filter syntax for creating complex filters.

> **Tip:** On Cost, Resource, Kubernetes Efficiency, Financial Commitment, and Network Flow Reports, you can create a filter and click **View as VQL** to see the filter represented in VQL.
>
> ![Show as VQL button on a Cost Report](https://assets.vantage.sh/docs/show-as-vql.png)

The below examples show how to use VQL. This example creates a saved filter in your Vantage account using VQL.

## Example

```json
{
  "filter": "(costs.provider = 'aws' AND costs.service = 'Amazon Relational Database Service') OR (costs.provider = 'gcp' AND costs.service = 'Cloud SQL')",
  "title": "RDS and Cloud SQL",
  "workspace_token": "wrkspc_abcde12345"
}
```

VQL is based on the following key concepts, further described in subsequent sections.

### Schema

VQL uses a schema that organizes filters into namespaces. These namespaces comprise various fields that you can leverage to filter and retrieve specific cost-related data.

### Keywords

VQL includes keywords, like `AND`, `OR`, `IN`, `LIKE`, and `NOT`, to create complex and precise filter conditions. These keywords vary per report type/scope.

### Syntax

VQL syntax closely resembles the `WHERE` clause of a SQL query. You can construct filter operations to extract desired cost insights.

## Scopes

VQL has a separate scope for each type of report—meaning that you cannot use VQL statements for Cost Reports when querying Resource Reports. See the following pages below to learn more about each VQL scope.

- [VQL for Cost Reports](file://vantage/vql/cost_report.md)
- [VQL for Resource Reports](file://vantage/vql/resource_report.md)
- [VQL for Kubernetes Efficiency Reports](file://vantage/vql/kubernetes_efficiency_report.md)
- [VQL for Financial Commitment Reports](file://vantage/vql/financial_commitment_report.md)
- [VQL for Network Flow Reports](file://vantage/vql/network_flow_report.md)
