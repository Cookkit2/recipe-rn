# Output values

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = module.api.api_endpoint
}

output "website_url" {
  description = "Website URL"
  value       = module.website.website_url
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "cdn_domain_name" {
  description = "CloudFront domain name"
  value       = module.cdn.domain_name
}

output "monitoring_dashboard_url" {
  description = "Grafana dashboard URL"
  value       = module.monitoring.dashboard_url
}

output "alert_manager_url" {
  description = "Alert manager URL"
  value       = module.monitoring.alert_manager_url
}
