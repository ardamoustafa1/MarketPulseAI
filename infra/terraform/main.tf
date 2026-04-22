terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "release_artifacts" {
  bucket = "${var.project_name}-${var.environment}-release-artifacts"
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/marketpulse/${var.environment}/app"
  retention_in_days = 30
}
