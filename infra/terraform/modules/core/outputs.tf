output "release_bucket_name" {
  value = aws_s3_bucket.release_artifacts.id
}

output "app_log_group" {
  value = aws_cloudwatch_log_group.app.name
}

output "api_ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "admin_ecr_repository_url" {
  value = aws_ecr_repository.admin.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.app.name
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = [for subnet in aws_subnet.private : subnet.id]
}

output "rds_endpoint" {
  value = var.enable_rds ? aws_db_instance.postgres[0].endpoint : null
}

output "rds_master_user_secret_arn" {
  value = var.enable_rds ? aws_db_instance.postgres[0].master_user_secret[0].secret_arn : null
}
