# Datasets

> **來源**: [Datasets](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/)
> **類別**: Cloudflare Logs - 日誌與監控
> **更新時間**: 2025/9/9 上午9:45:12

## API

## Availability

## Deprecation

## Recommendation

## Additional resources

## Was this helpful?

The datasets below describe the fields available by log category:

The list of fields can also be accessed directly from the API using the following endpoints:

For zone-scoped datasets: https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/datasets/<DATASET>/fields

For account-scoped datasets: https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/datasets/<DATASET>/fields

The <DATASET> argument indicates the log category. For example, http_requests, spectrum_events, firewall_events, nel_reports, or dns_logs.

Deprecated fields remain available to prevent breaking existing jobs. They may eventually become empty values if completely removed. Customers are encouraged to migrate away from deprecated fields if they are using them.

For log field ClientIPClass, Cloudflare recommends using bot tags to classify IPs.

For more information on logs available in Cloudflare Zero Trust, refer to Zero Trust logs.

- Zone-scoped datasets
- Account-scoped datasets

- For zone-scoped datasets: https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/datasets/<DATASET>/fields
- For account-scoped datasets: https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/datasets/<DATASET>/fields

- The availability of Logpush dataset fields depends on your subscription plan.
- Zone-scoped HTTP requests are available in both Logpush and Logpull.
- Custom fields for HTTP requests are only available in Logpush.
- All other datasets are only available through Logpush.

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

