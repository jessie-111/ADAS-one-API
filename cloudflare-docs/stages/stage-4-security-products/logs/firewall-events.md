# Firewall events

> **來源**: [Firewall events](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/firewall_events/)
> **類別**: Cloudflare Logs - 日誌與監控
> **更新時間**: 2025/9/9 上午9:45:14

## Action

## ClientASN

## ClientASNDescription

## ClientCountry

## ClientIP

## ClientIPClass

## ClientRefererHost

## ClientRefererPath

## ClientRefererQuery

## ClientRefererScheme

## ClientRequestHost

## ClientRequestMethod

## ClientRequestPath

## ClientRequestProtocol

## ClientRequestQuery

## ClientRequestScheme

## ClientRequestUserAgent

## ContentScanObjResults

## ContentScanObjSizes

## ContentScanObjTypes

## Datetime

## Description

## EdgeColoCode

## EdgeResponseStatus

## Kind

## LeakedCredentialCheckResult

## MatchIndex

## Metadata

## OriginResponseStatus

## OriginatorRayID

## RayID

## Ref

## RuleID

## Source

## Was this helpful?

The descriptions below detail the fields available for firewall_events.

Type: string

The code of the first-class action the Cloudflare Firewall took on this request. Possible actions are unknown | allow | block | challenge | jschallenge | log | connectionclose | challengesolved | challengebypassed | jschallengesolved | jschallengebypassed | bypass | managedchallenge | managedchallengenoninteractivesolved | managedchallengeinteractivesolved | managedchallengebypassed.

The ASN number of the visitor.

Type: string

The ASN of the visitor as string.

Type: string

Country from which request originated.

Type: string

The visitor's IP address (IPv4 or IPv6).

Type: string

The classification of the visitor's IP address, possible values are: unknown | badHost | searchEngine | allowlist | monitoringService | noRecord | scan | tor.

Type: string

The referer host.

Type: string

The referer path requested by visitor.

Type: string

The referer query-string was requested by the visitor.

Type: string

The referer URL scheme requested by the visitor.

Type: string

The HTTP hostname requested by the visitor.

Type: string

The HTTP method used by the visitor.

Type: string

The path requested by visitor.

Type: string

The version of HTTP protocol requested by the visitor.

Type: string

The query-string was requested by the visitor.

Type: string

The URL scheme requested by the visitor.

Type: string

Visitor's user-agent string.

Type: array[string]

List of content scan results.

Type: array[int]

List of content object sizes.

Type: array[string]

List of content types.

Type: int or string

The date and time the event occurred at the edge.

Type: string

The description of the rule triggered by this request.

Type: string

The airport code of the Cloudflare data center that served this request.

HTTP response status code returned to browser.

Type: string

The kind of event, currently only possible values are: firewall.

Type: string

Result of the check for leaked credentials. Possible results are: password_leaked | username_and_password_leaked | username_password_similar | username_leaked | clean.

Rules match index in the chain. The last matching rule will have MatchIndex 0. If another rule matched before the last one, it will have MatchIndex 1. The same applies to any other matching rules, which will have a MatchIndex value of 2, 3, and so on.

Type: object

Additional product-specific information. Metadata is organized in key:value pairs. Key and Value formats can vary by Cloudflare security product and can change over time.

HTTP origin response status code returned to browser.

Type: string

The RayID of the request that issued the challenge/jschallenge.

Type: string

The RayID of the request.

Type: string

The user-defined identifier for the rule triggered by this request. Use refs to label your rules individually alongside the Cloudflare-provided RuleID. You can set refs via the Rulesets API for some security products.

Type: string

The Cloudflare security product-specific RuleID triggered by this request.

Type: string

The Cloudflare security product triggered by this request. Possible sources are unknown | asn | country | ip | iprange | securitylevel | zonelockdown | waf | firewallrules | uablock | ratelimit | bic | hot | l7ddos | validation | botfight | apishield | botmanagement | dlp | firewallmanaged | firewallcustom | apishieldschemavalidation | apishieldtokenvalidation | apishieldsequencemitigation.

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

