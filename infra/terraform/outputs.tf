output "release_bucket_name" {
  value       = module.core.release_bucket_name
  description = "S3 bucket used for release artifacts"
}

output "app_log_group" {
  value       = module.core.app_log_group
  description = "CloudWatch log group for app runtime logs"
}
