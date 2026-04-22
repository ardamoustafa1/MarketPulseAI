output "release_bucket_name" {
  value       = module.core.release_bucket_name
  description = "S3 bucket used for release artifacts"
}

output "app_log_group" {
  value       = module.core.app_log_group
  description = "CloudWatch log group for app runtime logs"
}

output "api_ecr_repository_url" {
  value       = module.core.api_ecr_repository_url
  description = "ECR repository URL for API image"
}

output "admin_ecr_repository_url" {
  value       = module.core.admin_ecr_repository_url
  description = "ECR repository URL for Admin image"
}

output "ecs_cluster_name" {
  value       = module.core.ecs_cluster_name
  description = "ECS cluster name for runtime workloads"
}

output "alb_dns_name" {
  value       = module.core.alb_dns_name
  description = "Application Load Balancer DNS name"
}

output "vpc_id" {
  value       = module.core.vpc_id
  description = "VPC id for runtime stack"
}

output "private_subnet_ids" {
  value       = module.core.private_subnet_ids
  description = "Private subnet ids used by ECS services"
}

output "rds_endpoint" {
  value       = module.core.rds_endpoint
  description = "RDS endpoint when enable_rds is true"
}

output "rds_master_user_secret_arn" {
  value       = module.core.rds_master_user_secret_arn
  description = "Secrets Manager ARN for RDS master user credentials"
}
