variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project slug"
  type        = string
  default     = "marketpulse"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.40.1.0/24", "10.40.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.40.11.0/24", "10.40.12.0/24"]
}

variable "api_image" {
  description = "Container image for API service"
  type        = string
  default     = "ghcr.io/example/marketpulse-api:latest"
}

variable "admin_image" {
  description = "Container image for admin service"
  type        = string
  default     = "ghcr.io/example/marketpulse-admin:latest"
}

variable "api_desired_count" {
  description = "Desired count for API ECS service"
  type        = number
  default     = 2
}

variable "admin_desired_count" {
  description = "Desired count for admin ECS service"
  type        = number
  default     = 2
}

variable "acm_certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS listener"
  type        = string
  default     = ""
}

variable "enable_waf" {
  description = "Enable AWS WAF on ALB"
  type        = bool
  default     = true
}

variable "api_min_capacity" {
  description = "Minimum API task count for autoscaling"
  type        = number
  default     = 2
}

variable "api_max_capacity" {
  description = "Maximum API task count for autoscaling"
  type        = number
  default     = 6
}

variable "admin_min_capacity" {
  description = "Minimum admin task count for autoscaling"
  type        = number
  default     = 2
}

variable "admin_max_capacity" {
  description = "Maximum admin task count for autoscaling"
  type        = number
  default     = 4
}

variable "api_target_cpu_utilization" {
  description = "CPU target tracking for API ECS service"
  type        = number
  default     = 55
}

variable "admin_target_cpu_utilization" {
  description = "CPU target tracking for admin ECS service"
  type        = number
  default     = 50
}

variable "enable_rds" {
  description = "Enable managed RDS PostgreSQL instance"
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "marketpulse"
}

variable "db_username" {
  description = "Master DB username"
  type        = string
  default     = "marketpulse_admin"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_backup_window" {
  description = "Preferred daily backup window for RDS (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred weekly maintenance window for RDS (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "db_performance_insights_enabled" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}
