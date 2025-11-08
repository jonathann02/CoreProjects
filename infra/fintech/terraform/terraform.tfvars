# LocalStack configuration for development
aws_region         = "us-east-1"
aws_access_key     = "test"
aws_secret_key     = "test"
localstack_endpoint = "http://localhost:4566"
environment       = "development"

# Resource names
sns_topic_name    = "fintech-notifications"
email_queue_name  = "fintech-email-notifications"
sms_queue_name    = "fintech-sms-notifications"
push_queue_name   = "fintech-push-notifications"
s3_bucket_name    = "fintech-artifacts"
