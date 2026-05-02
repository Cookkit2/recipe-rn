# Staging environment configuration

environment        = "staging"
aws_region        = "us-east-1"
domain_name       = "staging.cookkit.app"

enable_monitoring = true
enable_backup     = true

instance_count    = 1
instance_type     = "t3.small"

db_instance_class     = "db.t3.micro"
db_allocated_storage  = 20
