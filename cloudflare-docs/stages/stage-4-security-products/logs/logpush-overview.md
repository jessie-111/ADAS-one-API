# Logpush

> **來源**: [Logpush](https://developers.cloudflare.com/logs/logpush/)
> **類別**: Cloudflare Logs - 日誌與監控
> **更新時間**: 2025/9/9 上午9:44:55

## Limits

## Availability

## Was this helpful?

Logpush delivers logs in batches as quickly as possible, with no minimum batch size, potentially delivering files more than once per minute. This capability enables Cloudflare to provide information almost in real time, in smaller file sizes. Users can configure the batch size using the API for improved control in case the log destination has specific requirements.

Logpush does not offer storage or search functionality for logs; its primary aim is to send logs as quickly as they arrive.

Cloudflare Logpush supports pushing logs to storage services, SIEMs, and log management providers via the Cloudflare dashboard or API.

Cloudflare aims to support additional services in the future. Interested in a particular service? Take this survey ↗.

There is currently a max limit of 4 Logpush jobs per zone. Trying to create a job once the limit has been reached will result in an error message: creating a new job is not allowed: exceeded max jobs allowed.

Availability

Users without an Enterprise plan can still access Workers Trace Events Logpush by subscribing to the Workers Paid plan.

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


|  | Free | Pro | Business | Enterprise |
|------|------|------|------|------|
| Availability | No | No | No | Yes |

