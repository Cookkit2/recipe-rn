# Production environment configuration

environment        = "production"
aws_region        = "us-east-1"
domain_name       = "cookkit.app"

enable_monitoring = true
enable_backup     = true

instance_count    = 3
instance_type     = "t3.medium"

db_instance_class     = "db.t3.large"
db_allocated_storage  = 100

# High availability settings
multi_az           = true
read_replica_count = 1
