---
title: "VQL for Network Flow Reports"
description: "Learn how to use VQL when querying Network Flow Reports in Vantage."
---

> **Tip:** If you need help constructing a VQL query, navigate to the **Network Flow Reports** page in the Vantage console and click **New Network Flow Report**. From the top left, open the **Filters** menu. Create a filter and click the **View as VQL** button at the top of the **Filters** menu to see a filter's VQL representation.

## Network Flow Reports VQL Schema

VQL for Network Flow Reports comprises one namespace, `network_flow_logs`, which represents the available filters on Network Flow Reports in the Vantage console. To reference a filter, use the following syntax: `namespace.field` (e.g., `network_flow_logs.account_id`). The following fields are available within the `network_flow_logs` namespace.

| Namespace | Field | VQL Example |
| --- | --- | --- |
| `network_flow_logs` | `account_id` | [Account ID example](#network-flows-by-account-id) |
| `network_flow_logs` | `az_id` | [Availability Zone ID example](#network-flows-by-availability-zone-id) |
| `network_flow_logs` | `dstaddr` | [Destination Address example](#network-flows-by-destination-address) |
| `network_flow_logs` | `dsthostname` | [Destination Hostname example](#network-flows-by-destination-hostname) |
| `network_flow_logs` | `interface_id` | [Interface ID example](#network-flows-by-interface-id) |
| `network_flow_logs` | `instance_id` | [Instance ID example](#network-flows-by-instance-id) |
| `network_flow_logs` | `peer_resource_uuid` | [Peer Resource UUID example](#network-flows-by-peer-resource-uuid) |
| `network_flow_logs` | `peer_account_id` | [Peer Account ID example](#network-flows-by-peer-account-id) |
| `network_flow_logs` | `peer_vpc_id` | [Peer VPC ID example](#network-flows-by-peer-vpc-id) |
| `network_flow_logs` | `peer_regions` | [Peer Regions example](#network-flows-by-peer-regions) |
| `network_flow_logs` | `peer_az_id` | [Peer AZ ID example](#network-flows-by-peer-az-id) |
| `network_flow_logs` | `peer_subnet_id` | [Peer Subnet ID example](#network-flows-by-peer-subnet-id) |
| `network_flow_logs` | `peer_interface_id` | [Peer Interface ID example](#network-flows-by-peer-interface-id) |
| `network_flow_logs` | `peer_instance_id` | [Peer Instance ID example](#network-flows-by-peer-instance-id) |
| `network_flow_logs` | `region` | [Region example](#network-flows-by-region) |
| `network_flow_logs` | `resource_uuid` | [Resource UUID example](#network-flows-by-resource-uuid) |
| `network_flow_logs` | `srcaddr` | [Source Address example](#network-flows-by-source-address) |
| `network_flow_logs` | `srchostname` | [Source Hostname example](#network-flows-by-source-hostname) |
| `network_flow_logs` | `subnet_id` | [Subnet ID example](#network-flows-by-subnet-id) |
| `network_flow_logs` | `traffic_category` | [Traffic Category example](#network-flows-by-traffic-category) |
| `network_flow_logs` | `traffic_path` | [Traffic Path example](#network-flows-by-traffic-path) |
| `network_flow_logs` | `vpc_id` | [VPC ID example](#network-flows-by-vpc-id) |

### Keywords

VQL includes a set of keywords to create complex filter conditions. These keywords function similar to their SQL equivalents.

| Keyword | Description | VQL Sample | Explanation |
| --- | --- | --- | --- |
| `AND` | Logical AND operator | `(network_flow_logs.account_id = '123456789012') AND (network_flow_logs.dsthostname = 'datadoghq.com')` | This example filters for a specific account and destination hostname, where both conditions must be true. |
| `OR` | Logical OR operator | `((network_flow_logs.account_id = '123456789012') AND (network_flow_logs.dsthostname = 'datadoghq.com')) OR ((network_flow_logs.account_id = '09876543212') AND (network_flow_logs.dsthostname = 'github.com'))` | This example looks for results associated with two accounts and destination hostnames. At least one condition must be true. |
| `!=` | Is not | `(network_flow_logs.dsthostname != 'github.com')` | This example looks for results that are any destination hostname type except for `github.com`. |
| `IN` and `NOT IN` | Used to compare against an array/list | `(network_flow_logs.peer_regions IN ('us-east-1','us-west-2'))` | This example searches for results within a set of regions.      This same query also works for `NOT IN` where the results are anything matching everything except for these regions: `(network_flow_logs.peer_regions NOT IN ('us-east-1','us-west-2'))`. |
| `LIKE` and `NOT LIKE` | Performs string comparisons | `(network_flow_logs.az_id LIKE '%use1%')` | This example selects data where the Availability Zone contains `use1`, such as `use1-az1`.      This same query also works for `NOT LIKE` where data does not contain a particular string: `(network_flow_logs.az_id NOT LIKE '%use1%')`. |

With these operators and keywords, you can construct complex filter conditions in VQL.

## VQL Examples

The following examples cover common use cases for VQL.

### Network Flows by Account ID

Network flows from a set of account IDs.

```sql
(network_flow_logs.account_id IN ('123456789012','098765432109'))
```

### Network Flows by Availability Zone ID

Filter for a substring based on Availability Zone.

```sql
(network_flow_logs.az_id LIKE '%use1%')
```

### Network Flows by Destination Address

All network flows that do not match a particular destination address.

```sql
(network_flow_logs.dstaddr != '1.123.456.7')
```

### Network Flows by Destination Hostname

Network flows from a set of destination hostnames.

```sql
(network_flow_logs.dsthostname IN ('datadoghq.com','github.com','sentry.io'))
```

### Network Flows by Interface ID

Network flows for a particular interface ID.

```sql
(network_flow_logs.interface_id = 'eni-000012345a6789123')
```

### Network Flows by Instance ID

Network flows for a particular instance ID.

```sql
(network_flow_logs.instance_id = 'i-0001a23b456c780c1')
```

### Network Flows by Peer Resource UUID

Network flows for peer resource UUIDs matching a substring.

```sql
(network_flow_logs.peer_resource_uuid LIKE '%arn:aws:ec2%')
```

### Network Flows by Peer Account ID

Network flows for anything that's not a particular peer account ID.

```sql
(network_flow_logs.peer_account_id != '123456789012')
```

### Network Flows by Peer VPC ID

Network flows for two different peer VPC IDs.

```sql
(network_flow_logs.peer_vpc_id IN ('vpc-12345678','vpc-0987654'))
```

### Network Flows by Peer Regions

Network flows for anything outside a set of peer regions.

```sql
(network_flow_logs.peer_regions NOT IN ('us-east-1','us-west-2'))
```

### Network Flows by Peer AZ ID

Network flows for a specific peer AZ.

```sql
(network_flow_logs.peer_az_id = 'use1-az1')
```

### Network Flows by Peer Subnet ID

Network flows for any peer subnet IDs that do not contain a substring.

```sql
(network_flow_logs.peer_subnet_id NOT LIKE '%subnet-022%')
```

### Network Flows by Peer Interface ID

Network flows based on a peer interface ID substring.

```sql
(network_flow_logs.peer_interface_id LIKE 'eni-0a1b2c3d%')
```

### Network Flows by Peer Instance ID

Network flows excluding a particular peer instance ID.

```sql
(network_flow_logs.peer_instance_id != 'i-0a1b2c3d4e5f67890')
```

### Network Flows by Region

Network flows in multiple regions.

```sql
(network_flow_logs.region IN ('us-east-1', 'us-west-2', 'eu-central-1'))
```

### Network Flows by Resource UUID

Network flows for resources not matching a specific UUID substring.

```sql
(network_flow_logs.resource_uuid NOT LIKE '123e4567%')
```

### Network Flows by Source Address

Network flows from a set of source addresses.

```sql
(network_flow_logs.srcaddr IN ('192.168.1.1', '10.0.0.5', '172.16.0.10'))
```

### Network Flows by Source Hostname

Network flows excluding specific source hostnames.

```sql
(network_flow_logs.srchostname NOT IN ('example.com', 'internal.service.local'))
```

### Network Flows by Subnet ID

Network flows for subnets with a specific prefix.

```sql
(network_flow_logs.subnet_id LIKE 'subnet-0a1b%')
```

### Network Flows by Traffic Category

Only cross-region traffic.

```sql
(network_flow_logs.traffic_category = 'cross-region')
```

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

```sql
(network_flow_logs.traffic_path = '5')
```

### Network Flows by VPC ID

Everything except for a specific VPC.

```sql
(network_flow_logs.vpc_id != 'vpc-12c12345a12345678')
```

### Multiple Filters

Complex filter that shows combining two different statements using `OR` with multiple criteria.

```sql
((network_flow_logs.dsthostname = 'datadoghq.com') AND (network_flow_logs.account_id = '1234354678901')) OR ((network_flow_logs.dsthostname = 'github.com') AND (network_flow_logs.account_id = '90876543211'))
```
