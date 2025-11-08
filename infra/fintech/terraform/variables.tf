variable "aws_region" {
  description = "AWS region for LocalStack"
  type        = string
  default     = "us-east-1"
}

variable "aws_access_key" {
  description = "AWS access key for LocalStack"
  type        = string
  default     = "test"
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key for LocalStack"
  type        = string
  default     = "test"
  sensitive   = true
}

variable "localstack_endpoint" {
  description = "LocalStack endpoint URL"
  type        = string
  default     = "http://localhost:4566"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "sns_topic_name" {
  description = "Name of the SNS topic for notifications"
  type        = string
  default     = "fintech-notifications"
}

variable "email_queue_name" {
  description = "Name of the SQS queue for email notifications"
  type        = string
  default     = "fintech-email-notifications"
}

variable "sms_queue_name" {
  description = "Name of the SQS queue for SMS notifications"
  type        = string
  default     = "fintech-sms-notifications"
}

variable "push_queue_name" {
  description = "Name of the SQS queue for push notifications"
  type        = string
  default     = "fintech-push-notifications"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for artifacts"
  type        = string
  default     = "fintech-artifacts"
}
