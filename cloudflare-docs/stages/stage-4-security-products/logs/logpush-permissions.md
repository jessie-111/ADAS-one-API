# Permissions

> **來源**: [Permissions](https://developers.cloudflare.com/logs/logpush/permissions/)
> **類別**: Cloudflare Logs - 日誌與監控
> **更新時間**: 2025/9/9 上午9:44:57

## Tokens

## Roles

### Assign or remove a role

## Was this helpful?

Below is a description of the available permissions for tokens and roles as they relate to Logs. For information about how to create an API token, refer to Creating API tokens.

Logs: Read - Grants read access to logs using Logpull or Instant Logs.

Logs: Write - Grants read and write access to Logpull and Logpush, and read access to Instant Logs. Note that all Logpush API operations require Logs: Write permission because Logpush jobs contain sensitive information.

Permissions must be explicitly configured at the appropriate level (zone or account) to ensure access to the desired API endpoints.

Super Administrator, Administrator and the Log Share roles have full access to Logpull, Logpush and Instant Logs.

Only roles with Log Share edit permissions can read and configure Logpush jobs because job configurations may contain sensitive information.

The Administrator Read only and Log Share Reader roles only have access to Instant Logs and Logpull. This role does not have permissions to view the configuration of Logpush jobs.

To check the list of members in your account, or to manage roles and permissions:

For more information, refer to Managing roles within your Cloudflare account.

- Logs: Read - Grants read access to logs using Logpull or Instant Logs.
- Logs: Write - Grants read and write access to Logpull and Logpush, and read access to Instant Logs. Note that all Logpush API operations require Logs: Write permission because Logpush jobs contain sensitive information.

- Zone-scoped datasets require a zone-scoped token.
- Account-scoped datasets require an account-scoped token.

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

