---
title: VQL for Kubernetes Efficiency Reports
description: Learn how to use VQL when querying Kubernetes Efficiency Reports in Vantage.
---

> **Tip:** If you need help constructing a VQL query, navigate to the **Kubernetes Efficiency Reports** page in the Vantage console and click **New Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Kubernetes Efficiency Reports VQL Schema

VQL for Kubernetes Efficiency Reports comprises one namespace, `kubernetes`, which represents the available filters on Kubernetes Efficiency Reports in the Vantage console. To reference a filter, use the following syntax: `namespace.field` (e.g., `kubernetes.category`). The following fields are available within the `kubernetes` namespace.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| `kubernetes` | `namespace` | [Namespace example](#multiple-namespaces) |
| `kubernetes` | `cluster_id` | [Cluster ID example](#results-from-a-list-of-clusters) |
| `kubernetes` | `category` | [Category example](#costs-by-category) |
| `kubernetes` | `labels` | [Labels example](#filter-by-label) |
| `kubernetes` | `pod` | [Pod example](#filter-by-pod) |

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| `AND` | Logical AND operator | `(kubernetes.namespace = 'kube-system') AND (kubernetes.labels->>'app' = 'vantage-agent')` | This example filters for a specific namespace and label, where both conditions must be true. |
| `OR` | Logical OR operator | `(kubernetes.namespace = 'gpu-operator') OR (kubernetes.namespace = 'vantage-dev')` | This example looks for results in two different namespaces. At least one condition must be true. |
| `!=` | Is not | `(kubernetes.cluster_id != 'dev-eks-gpu-0')` | This example looks for results that are in any cluster except for `dev-eks-gpu-0`. |
| `IN` and `NOT IN` | Used to compare against an array/list | `(kubernetes.labels->>'app.kubernetes.io/component' IN ('csi-driver','gpu-operator','metrics'))` | This example searches for results with the `app.kubernetes.io/component` key and multiple values.      This same query also works for `NOT IN` where the results are anything matching the label key except for those particular values: `(kubernetes.labels->>'app.kubernetes.io/component' NOT IN ('csi-driver','gpu-operator','metrics'))`. |
| `LIKE` and `NOT LIKE` | Performs string comparisons | `(kubernetes.labels->>'app' LIKE '%test%')` | This example selects data where the `app` label value contains `test`, such as `test-app`.      This same query also works for `NOT LIKE` where data does not contain a particular string: `(kubernetes.labels->>'app' NOT LIKE '%test%')`. |
| `->>` | This operator is used only when constructing queries related to labels | `(kubernetes.labels->>'container' = 'kube-prometheus-stack-48.4.0')` | This example looks for results with the label name of `container` and value of `kube-prometheus-stack-48.4.0`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Multiple Namespaces

Filter for one or the other namespace.

```sql
(kubernetes.namespace = 'kube-system') OR (kubernetes.namespace = 'default')
```

### Results from a List of Clusters

Filter for a list of different clusters.

```sql
(kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN'))
```

### Costs by Category

Costs for a specific category, like `cpu`.

```sql
(kubernetes.category = 'cpu')
```

### Filter by Label

Filter based on a specific Kubernetes label, such as `app`, with the value `rollouts-demo`.

```sql
(kubernetes.labels->>'app' = 'rollouts-demo')
```

### Filter by Pod

Filter for a specific pod.

```sql
(kubernetes.pod = 'my-pod-name')
```

### Multiple Filters

Complex filter that shows combining two different statements using `OR` with multiple criteria.

```sql
((kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN')) AND (kubernetes.category = 'cpu')) OR ((kubernetes.cluster_id IN ('dev-eks-gpu-0','dev-eks-UVmPe9YN')) AND (kubernetes.category = 'gpu'))
```
