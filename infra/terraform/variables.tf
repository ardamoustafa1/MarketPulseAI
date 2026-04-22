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
