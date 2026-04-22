terraform {
  required_version = ">= 1.6.0"
}

module "marketpulse" {
  source = "../../"

  aws_region   = "us-east-1"
  project_name = "marketpulse"
  environment  = "staging"
}
