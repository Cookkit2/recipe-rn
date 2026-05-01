# Terraform Infrastructure

This directory contains the Terraform configuration for deploying Recipe RN infrastructure.

## Overview

The Terraform configuration provisions:

- AWS infrastructure (EC2, RDS, S3, CloudFront)
- Networking (VPC, subnets, security groups)
- Database (PostgreSQL with backups)
- CDN (CloudFront for static assets)
- Monitoring (Prometheus, Grafana)

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured
- AWS account with appropriate permissions
- S3 bucket for Terraform state
- DynamoDB table for state locking

## Setup

### 1. Backend Configuration

Create an S3 bucket and DynamoDB table for Terraform state:

```bash
aws s3api create-bucket \
  --bucket recipe-rn-terraform-state \
  --region us-east-1

aws dynamodb create-table \
  --table-name recipe-rn-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Deployment

For staging:

```bash
terraform plan -var-file=environments/staging.tfvars
```

For production:

```bash
terraform plan -var-file=environments/production.tfvars
```

### 4. Deploy

For staging:

```bash
terraform apply -var-file=environments/staging.tfvars
```

For production:

```bash
terraform apply -var-file=environments/production.tfvars
```

## Configuration

### Variables

See `variables.tf` for all available variables. Key variables:

- `environment`: staging or production
- `aws_region`: AWS region (default: us-east-1)
- `domain_name`: Domain name for the application
- `instance_count`: Number of instances
- `instance_type`: EC2 instance type
- `db_instance_class`: RDS instance class
- `enable_monitoring`: Enable monitoring stack
- `enable_backup`: Enable automated backups

### Environment Files

- `environments/staging.tfvars`: Staging configuration
- `environments/production.tfvars`: Production configuration

## Outputs

After deployment, the following outputs are available:

- `api_endpoint`: API endpoint URL
- `website_url`: Website URL
- `database_endpoint`: Database endpoint (sensitive)
- `cdn_distribution_id`: CloudFront distribution ID
- `cdn_domain_name`: CloudFront domain name
- `monitoring_dashboard_url`: Grafana dashboard URL
- `alert_manager_url`: Alert manager URL

## Workflows

### Initial Deployment

1. Configure backend in `main.tf`
2. Create S3 bucket and DynamoDB table
3. Run `terraform init`
4. Run `terraform plan` to review changes
5. Run `terraform apply` to deploy

### Updating Infrastructure

1. Make changes to Terraform files
2. Run `terraform plan` to review changes
3. Run `terraform apply` to apply changes
4. Verify deployment

### Destroying Infrastructure

⚠️ **WARNING**: This will destroy all resources!

For staging:

```bash
terraform destroy -var-file=environments/staging.tfvars
```

For production:

```bash
terraform destroy -var-file=environments/production.tfvars
```

## Security

- State files are encrypted in S3
- State locking via DynamoDB
- No secrets in state (use environment variables)
- IAM roles with least privilege
- Security groups restrict access

## Backup and Recovery

### Database Backups

- Automated daily backups
- 30-day retention
- Point-in-time recovery enabled

### State Backups

- Terraform state in S3 with versioning
- Automatic backups before changes
- Can restore previous state versions

## Monitoring

- CloudWatch metrics configured
- Alerts for critical issues
- Grafana dashboards available
- Log aggregation enabled

## Cost Optimization

- Use appropriate instance sizes
- Enable Reserved Instances for production
- Monitor costs regularly
- Clean up unused resources

## Troubleshooting

### State Lock Issues

If state is locked:

```bash
terraform force-unlock <LOCK_ID>
```

### Drift Detection

Check for drift:

```bash
terraform plan -refresh-only
```

### Import Existing Resources

If you need to import existing resources:

```bash
terraform import <ADDRESS> <ID>
```

## Best Practices

1. **Always review plans** before applying
2. **Use separate workspaces** for staging/production
3. **Enable state locking** to prevent conflicts
4. **Encrypt state files** at rest
5. **Use version control** for all Terraform files
6. **Document custom resources** and modules
7. **Tag all resources** appropriately
8. **Regularly update** Terraform and providers
9. **Test changes** in staging first
10. **Monitor costs** and resource usage

## Maintenance

### Regular Tasks

- **Weekly**: Review Terraform updates
- **Monthly**: Update providers and modules
- **Quarterly**: Review and optimize costs
- **Annually**: Security audit and compliance review

### Updating Providers

```bash
terraform init -upgrade
```

### Formatting Code

```bash
terraform fmt -recursive
```

### Validating Configuration

```bash
terraform validate
```

## Support

For infrastructure issues:

- Create an issue in the repository
- Contact the DevOps team
- Review AWS documentation
- Check Terraform documentation

## Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
