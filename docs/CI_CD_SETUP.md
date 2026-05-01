# CI/CD and Security Setup Guide

## Overview

This document describes the comprehensive CI/CD pipeline and security scanning setup for the Recipe RN project.

## CI/CD Pipeline Architecture

### Workflow Files

#### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to main, master, develop, staging branches
- Pull requests to main, master, develop, staging

**Jobs:**

1. **Quality Gate**
   - TypeScript strict mode check
   - ESLint validation
   - Prettier formatting check
   - Must pass before other jobs run

2. **Test Suite**
   - Runs all tests with coverage
   - Enforces 80% coverage threshold
   - Uploads coverage to Codecov
   - Blocks merge if coverage below threshold

3. **Dependency Audit**
   - pnpm audit (moderate level)
   - npm audit (moderate level)
   - Blocks merge on vulnerabilities

4. **Build Verification**
   - Verifies TypeScript compilation
   - Ensures build succeeds

#### 2. Security Scanning (`.github/workflows/security-scan.yml`)

**Triggers:**
- Push to main, master, develop, staging
- Pull requests to main, master, develop, staging
- Daily schedule at 2 AM UTC
- Manual workflow dispatch

**Jobs:**

1. **CodeQL SAST**
   - GitHub's static analysis
   - JavaScript/TypeScript scanning
   - Extended security queries
   - Results uploaded to GitHub Security

2. **Semgrep SAST**
   - Community security rules
   - Custom security patterns
   - Blocks on critical findings

3. **Gitleaks (Secrets Scanning)**
   - Scans for exposed secrets
   - Checks commit history
   - Blocks merge if secrets found

4. **Snyk Dependency Scan**
   - Scans for known vulnerabilities
   - Checks license compliance
   - Results to GitHub Security

5. **npm Audit**
   - Additional dependency check
   - Production dependencies only

6. **Security Policy Check**
   - Verifies SECURITY.md exists
   - Checks for sensitive files

7. **OSSF Scorecard**
   - Open source security best practices
   - Automated security score

#### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to staging branch
- Push to main/master branch
- Manual dispatch with environment selection

**Jobs:**

1. **Staging Deployment**
   - Runs tests
   - Builds application
   - Deploys to staging
   - Notifies on success/failure
   - Automatic rollback on failure

2. **Production Deployment**
   - Runs all tests and audits
   - Creates deployment backup
   - Blue-green deployment
   - Health checks
   - Smoke tests
   - Automatic rollback on failure

3. **Mobile App Build**
   - iOS build via EAS
   - Android build via EAS
   - Triggered on main/master merge

## Security Features

### Automated Security Scanning

#### Static Application Security Testing (SAST)
- **CodeQL**: GitHub's advanced static analysis
- **Semgrep**: Community-driven security rules
- **Coverage**: All JavaScript/TypeScript code

#### Secrets Detection
- **Gitleaks**: Scans for 200+ secret patterns
- **Checks**: API keys, tokens, certificates, passwords
- **Scope**: All commits and branches

#### Dependency Scanning
- **Snyk**: Known vulnerabilities in dependencies
- **npm audit**: Official npm security audit
- **pnpm audit**: Package manager audit
- **Frequency**: Every commit + daily scan

#### Security Gates
- **Block merge** if any critical vulnerability found
- **Block merge** if secrets detected
- **Block merge** if security checks fail
- **Require approval** for security policy changes

### Quality Gates

#### Code Quality
- **TypeScript strict mode**: Must pass
- **ESLint**: Zero errors allowed
- **Prettier**: Code formatting enforced
- **Build**: Must compile without errors

#### Testing
- **Unit tests**: Must all pass
- **Coverage**: Minimum 80% required
- **Integration tests**: Must pass
- **E2E tests**: Must pass (if configured)

#### Security
- **SAST**: No critical findings
- **Secrets scan**: No secrets detected
- **Dependencies**: No high/critical vulnerabilities
- **Policy**: SECURITY.md must exist

## Deployment Strategy

### Blue-Green Deployment

**Benefits:**
- Zero downtime deployments
- Instant rollback capability
- Easy testing before traffic switch
- Reduced deployment risk

**Process:**
1. Deploy to green environment
2. Run health checks on green
3. Run smoke tests on green
4. Switch traffic to green
5. Monitor for issues
6. Keep blue for rollback
7. Terminate blue after success period

### Rollback Strategy

**Automatic Rollback Triggers:**
- Health check failures
- Smoke test failures
- Error rate spike (>5%)
- Latency spike (>2x baseline)
- Manual trigger via GitHub Actions

**Rollback Process:**
1. Detect failure condition
2. Switch traffic back to blue
3. Verify blue health
4. Notify team
5. Create incident ticket
6. Investigate root cause

## Dependency Management

### Dependabot Configuration

**Update Schedule:**
- GitHub Actions: Weekly (Monday)
- npm dependencies: Weekly (Tuesday)
- Docker: Weekly (Wednesday)
- Terraform: Weekly (Thursday)

**Grouped Updates:**
- React-related packages
- Expo packages
- Testing dependencies
- Development dependencies

**Blocked Updates:**
- Major version updates for React/React Native
- Major version updates for Expo
- Requires manual review

### Security Updates

**Automated:**
- Dependabot PRs for security patches
- Automated security scanning
- Automated version pinning

**Manual:**
- Major version updates
- Breaking changes
- Security advisories review

## Monitoring and Observability

### Prometheus Metrics

**Application Metrics:**
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Active users
- Authentication success rate

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk usage
- Network traffic
- Database connections

### Grafana Dashboards

**Pre-configured Dashboards:**
- Application overview
- API performance
- Database health
- Authentication metrics
- Business metrics

### Alerting

**Critical Alerts:**
- Service down (2min)
- High error rate (>5%)
- Brute force attack detected
- Database pool exhausted

**Warning Alerts:**
- High latency (>1s p95)
- High auth failure rate (>30%)
- Slow queries detected

**Info Alerts:**
- Low user activity
- High recipe creation rate

## Environment Configuration

### Environment Variables

**Required Files:**
- `.env.example`: Template for all variables
- `.env.staging.example`: Staging configuration
- `.env.production.example`: Production configuration

**Security Rules:**
- Never commit `.env.local` or actual secrets
- Use example files for documentation
- Validate all required variables
- Rotate secrets regularly

### Secret Management

**GitHub Secrets:**
- `CODECOV_TOKEN`: Codecov coverage upload
- `SNYK_TOKEN`: Snyk dependency scanning
- `EXPO_TOKEN`: Expo/EAS builds
- `GITLEAKS_LICENSE`: Gitleaks scanning

**Environment-Specific:**
- Staging secrets
- Production secrets
- Separate secret scopes

## Branch Protection

### Main/Master Branch

**Rules:**
- Require pull request reviews (1+)
- Require CODEOWNER approval
- All status checks must pass
- No direct pushes
- Administrators cannot bypass

### Staging Branch

**Rules:**
- Require pull request reviews (1+)
- CI checks must pass
- Tests must pass
- Security audit required

### Feature Branches

**Naming Convention:**
- `feature/ticket-description`
- `bugfix/ticket-description`
- `hotfix/ticket-description`

**Workflow:**
1. Create from main/master
2. Make changes with tests
3. Create pull request
4. Wait for all checks
5. Get CODEOWNER approval
6. Merge when approved

## Pull Request Templates

### Required Sections

**Bug Reports:**
- Description of bug
- Steps to reproduce
- Expected behavior
- Environment details
- Screenshots (if applicable)

**Feature Requests:**
- Problem statement
- Proposed solution
- Alternatives considered
- Implementation estimate

**All PRs:**
- Type of change
- Related issues
- Testing checklist
- Security checklist
- Code quality checklist

## Issue Templates

### Bug Report Template
- Bug description
- Reproduction steps
- Expected vs actual behavior
- Environment details
- Priority level

### Feature Request Template
- Problem description
- Proposed solution
- Alternatives considered
- Priority and estimate

### Security Report Template
- Vulnerability description
- Affected components
- Impact assessment
- Severity level
- Suggested fix

## CODEOWNERS

**File Ownership:**
- Global: @ming
- Documentation: @doc-team
- CI/CD: @devops-team
- Security: @security-team
- Frontend: @frontend-team
- Backend: @backend-team
- Database: @database-team
- Testing: @qa-team
- Mobile: @mobile-team

## Infrastructure as Code

### Terraform Configuration

**Files:**
- `terraform/main.tf`: Provider and backend config
- `terraform/variables.tf`: Input variables
- `terraform/outputs.tf`: Output values
- `terraform/environments/staging.tfvars`: Staging config
- `terraform/environments/production.tfvars`: Production config

**Features:**
- Multi-environment support
- State management with S3
- Lock management with DynamoDB
- Automated deployments

## Setup Instructions

### Initial Setup

1. **Enable GitHub Actions**
   - Go to repository Settings > Actions
   - Enable Actions for this repository

2. **Configure Secrets**
   - Go to Settings > Secrets and variables > Actions
   - Add required secrets (see Environment Configuration)

3. **Enable Branch Protection**
   - Go to Settings > Branches
   - Add rules for main/master
   - Configure as per Branch Protection section

4. **Install Dependabot**
   - Go to Settings > Code security and analysis
   - Enable Dependabot
   - Enable Dependabot security updates

5. **Enable Code Scanning**
   - Go to Settings > Code security and analysis
   - Enable CodeQL
   - Enable secret scanning

### Monitoring Setup

1. **Start Monitoring Stack**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Access Grafana**
   - URL: http://localhost:3001
   - Default credentials: admin/changeme
   - Change password on first login

3. **Import Dashboards**
   - Import `monitoring/grafana-dashboard.json`
   - Configure Prometheus datasource

4. **Configure Alerts**
   - Set up alert routing in Alertmanager
   - Configure notification channels (Slack, email, etc.)

### Terraform Setup

1. **Configure Backend**
   - Create S3 bucket for state
   - Create DynamoDB table for locks

2. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

3. **Plan Deployment**
   ```bash
   terraform plan -var-file=environments/staging.tfvars
   ```

4. **Apply Changes**
   ```bash
   terraform apply -var-file=environments/staging.tfvars
   ```

## Troubleshooting

### Common Issues

**CI Failures:**
- Check logs in Actions tab
- Verify all secrets are configured
- Ensure branch protection rules are set

**Security Scan Failures:**
- Review Security tab for details
- Check for false positives
- Update ignore patterns if needed

**Deployment Failures:**
- Check deployment logs
- Verify environment variables
- Check health endpoints
- Review rollback logs

**Coverage Failures:**
- Run `pnpm test:coverage` locally
- Check coverage threshold
- Add tests for uncovered code

## Best Practices

### Development
- Write tests for all new code
- Run tests locally before pushing
- Use TypeScript strict mode
- Follow code style guidelines
- Document complex logic

### Security
- Never commit secrets
- Rotate secrets regularly
- Review dependencies monthly
- Update dependencies regularly
- Report security issues privately

### Deployment
- Test in staging first
- Use blue-green deployment
- Monitor after deployment
- Have rollback plan ready
- Document all changes

### Monitoring
- Set up alerts for critical metrics
- Review dashboards regularly
- Investigate anomalies promptly
- Maintain runbooks
- Update alerts as needed

## Maintenance

### Regular Tasks

**Daily:**
- Review security scan results
- Check deployment status
- Review critical alerts

**Weekly:**
- Review Dependabot PRs
- Update dependencies
- Review error rates
- Check performance metrics

**Monthly:**
- Security audit
- Dependency review
- Performance review
- Cost optimization
- Documentation update

### Updates

**CI/CD Updates:**
- Update GitHub Actions versions monthly
- Review and update security tools
- Optimize workflow performance
- Update documentation

**Security Updates:**
- Apply security patches immediately
- Review security advisories
- Update scanning tools
- Test security updates in staging

## Support

For questions or issues:
- Create an issue in the repository
- Contact the DevOps team
- Review troubleshooting section
- Check GitHub Actions documentation

## Changelog

### Version 1.0.0 (2024)
- Initial CI/CD setup
- Security scanning integration
- Deployment automation
- Monitoring setup
- Documentation
