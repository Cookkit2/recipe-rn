# Security Policy

## Supported Versions

Currently, only the latest version of the recipe-rn application is supported with security updates.

| Version | Supported              |
| ------- | ---------------------- |
| Latest  | :white_check_mark: Yes |

## Reporting a Vulnerability

The recipe-rn team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

If you discover a security vulnerability, please report it immediately:

**Email**: security@cookkit.app

Please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

**Response Time**: We will acknowledge your report within 48 hours and provide a detailed response within 7 days.

**Encryption**: For sensitive vulnerabilities, you can encrypt your report using our PGP key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[PGP KEY TO BE ADDED]
-----END PGP PUBLIC KEY BLOCK-----
```

## Security Features

The recipe-rn application implements multiple security measures:

### Authentication & Authorization

- Supabase-based authentication with JWT tokens
- OAuth integration (Google, Apple)
- Secure token storage with MMKV encryption
- Session validation and refresh mechanisms

### Data Protection

- Encrypted local storage for sensitive data (MMKV with encryption key)
- SecureStore for authentication tokens
- Input sanitization to prevent injection attacks
- HTTPS-only communication with backend services

### API Security

- SQL injection prevention through parameterized queries
- Input validation and sanitization
- Rate limiting on authentication endpoints
- CORS configuration for web views

### Mobile Security

- Certificate pinning (to be implemented)
- Root/jailbreak detection (to be implemented)
- Code obfuscation (to be implemented)
- Secure deep link handling

## Security Best Practices

### For Developers

- Never commit sensitive data (API keys, secrets) to version control
- Use environment variables for configuration
- Follow OWASP Mobile Security guidelines
- Implement proper error handling without exposing sensitive information
- Validate and sanitize all user inputs

### For Users

- Use strong passwords (12+ characters, mixed types)
- Enable biometric authentication when available
- Keep the app updated to the latest version
- Report suspicious activity immediately

## Security Audit History

| Date       | Version | Findings                               | Status              |
| ---------- | ------- | -------------------------------------- | ------------------- |
| 2026-05-03 | 1.1.0   | 28 Critical, 36 High, 30 Medium, 8 Low | Partially addressed |

### Audit Summary

A comprehensive code review was conducted covering:

- Code Quality & Architecture
- Security & Performance
- Testing & Documentation
- Best Practices & Standards

Critical security issues identified and addressed:

- SQL injection vulnerabilities
- Weak password validation
- Missing rate limiting
- OAuth redirect URL validation
- Error message information disclosure

## Severity Levels

- **Critical**: Immediate risk of data loss or system compromise (CVSS 9.0-10.0)
- **High**: Significant risk requiring immediate attention (CVSS 7.0-8.9)
- **Medium**: Moderate risk with potential impact (CVSS 4.0-6.9)
- **Low**: Minor issues with limited impact (CVSS 0.1-3.9)

## Recent Security Improvements

As of 2026-05-03, the following security improvements have been implemented:

1. **SQL Injection Prevention**: Fixed SQL injection vulnerability in BaseIngredientApi.ts
2. **Strong Password Validation**: Implemented comprehensive password validation
3. **Rate Limiting**: Added rate limiting for authentication endpoints
4. **OAuth Security**: Implemented redirect URL validation with whitelist
5. **Error Sanitization**: Sanitized error messages to prevent information disclosure
6. **Sensitive Data Filtering**: Added automatic filtering of sensitive data from logs
7. **Encryption Key Validation**: Added validation for MMKV encryption keys

## Security Contacts

- **Security Team**: security@cookkit.app
- **Lead Developer**: [Contact via GitHub issues]
- **Disclosures**: Coordinated through security@cookkit.app

## Security Policy Updates

This security policy may be updated from time to time. We encourage users to review this policy periodically.

Last updated: 2026-05-03
