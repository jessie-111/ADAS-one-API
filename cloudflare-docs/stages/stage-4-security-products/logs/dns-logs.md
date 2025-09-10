# DNS logs

> **來源**: [DNS logs](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/dns_logs/)
> **類別**: Cloudflare Logs - 日誌與監控
> **更新時間**: 2025/9/9 上午9:45:16

## ColoCode

## EDNSSubnet

## EDNSSubnetLength

## QueryName

## QueryType

## ResponseCached

## ResponseCode

## SourceIP

## Timestamp

## Was this helpful?

The descriptions below detail the fields available for dns_logs.

Type: string

IATA airport code of the data center that received the request.

Type: string

IPv4 or IPv6 address information corresponding to the EDNS Client Subnet (ECS) forwarded by recursive resolvers. Not all resolvers send this information.

Size of the EDNS Client Subnet (ECS) in bits. For example, if the last octet of an IPv4 address is omitted (192.0.2.x.), the subnet length will be 24.

Type: string

Name of the query that was sent.

Integer value of query type. For more information refer to Query type ↗.

Whether the response was cached or not.

Integer value of response code. For more information refer to  Response code ↗.

Type: string

IP address of the client (IPv4 or IPv6).

Type: int or string

Timestamp at which the query occurred.

- Resources
- API
- New to Cloudflare?
- Directory
- Sponsorships
- Open Source

- Support
- Help Center
- System Status
- Compliance
- GDPR

- Company
- cloudflare.com
- Our team
- Careers

- Tools
- Cloudflare Radar
- Speed Test
- Is BGP Safe Yet?
- RPKI Toolkit
- Certificate Transparency

- Community
- X
- Discord
- YouTube
- GitHub

- © 2025 Cloudflare, Inc.
- Privacy Policy
- Terms of Use
- Report Security Issues
- Trademark
- Cookie Settings

