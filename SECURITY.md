# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest `main` | ✅ |
| older tags | ❌ |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Send a private report via [GitHub Security Advisories](https://github.com/astrixgame/s3explorer/security/advisories/new)
or email the maintainer directly.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 72 hours. Once the issue is confirmed and a
fix is released, a CVE will be requested if appropriate and you will be credited
in the release notes.

## Credential Security

S3 Explorer stores credentials in plain JSON in the OS user-data directory. No
credentials are transmitted to any third party. All S3 API calls are made
directly from the local Electron main process to the configured endpoint.
