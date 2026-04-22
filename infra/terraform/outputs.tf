output "release_bucket_name" {
  value       = aws_s3_bucket.release_artifacts.id
  description = "S3 bucket used for release artifacts"
}

output "app_log_group" {
  value       = aws_cloudwatch_log_group.app.name
  description = "CloudWatch log group for app runtime logs"
}
