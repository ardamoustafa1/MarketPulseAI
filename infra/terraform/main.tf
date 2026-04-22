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

module "core" {
  source      = "./modules/core"
  aws_region  = var.aws_region
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  api_image    = var.api_image
  admin_image  = var.admin_image
  api_desired_count   = var.api_desired_count
  admin_desired_count = var.admin_desired_count
  acm_certificate_arn = var.acm_certificate_arn
  enable_waf          = var.enable_waf
  api_min_capacity    = var.api_min_capacity
  api_max_capacity    = var.api_max_capacity
  admin_min_capacity  = var.admin_min_capacity
  admin_max_capacity  = var.admin_max_capacity
  api_target_cpu_utilization   = var.api_target_cpu_utilization
  admin_target_cpu_utilization = var.admin_target_cpu_utilization
  enable_rds          = var.enable_rds
  db_name             = var.db_name
  db_username         = var.db_username
  db_instance_class   = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_backup_window    = var.db_backup_window
  db_maintenance_window = var.db_maintenance_window
  db_performance_insights_enabled = var.db_performance_insights_enabled
}
