output "release_bucket_name" {
  value = aws_s3_bucket.release_artifacts.id
}

output "app_log_group" {
  value = aws_cloudwatch_log_group.app.name
}
