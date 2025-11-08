terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider for LocalStack
provider "aws" {
  region                      = var.aws_region
  access_key                  = var.aws_access_key
  secret_key                  = var.aws_secret_key
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sns = var.localstack_endpoint
    sqs = var.localstack_endpoint
    s3  = var.localstack_endpoint
    iam = var.localstack_endpoint
    sts = var.localstack_endpoint
  }
}

# SNS Topic for notifications
resource "aws_sns_topic" "fintech_notifications" {
  name = var.sns_topic_name

  tags = {
    Environment = var.environment
    Project     = "fintech"
    ManagedBy   = "terraform"
  }
}

# SQS Queue for email notifications
resource "aws_sqs_queue" "email_notifications" {
  name = var.email_queue_name

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_notifications_dlq.arn
    maxReceiveCount     = 3
  })

  # Message retention and visibility
  message_retention_seconds  = 86400  # 24 hours
  visibility_timeout_seconds = 30

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "email"
    ManagedBy   = "terraform"
  }
}

# Dead letter queue for email notifications
resource "aws_sqs_queue" "email_notifications_dlq" {
  name = "${var.email_queue_name}-dlq"

  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "email-dlq"
    ManagedBy   = "terraform"
  }
}

# SQS Queue for SMS notifications
resource "aws_sqs_queue" "sms_notifications" {
  name = var.sms_queue_name

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sms_notifications_dlq.arn
    maxReceiveCount     = 3
  })

  # Message retention and visibility
  message_retention_seconds  = 86400  # 24 hours
  visibility_timeout_seconds = 30

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "sms"
    ManagedBy   = "terraform"
  }
}

# Dead letter queue for SMS notifications
resource "aws_sqs_queue" "sms_notifications_dlq" {
  name = "${var.sms_queue_name}-dlq"

  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "sms-dlq"
    ManagedBy   = "terraform"
  }
}

# SQS Queue for push notifications
resource "aws_sqs_queue" "push_notifications" {
  name = var.push_queue_name

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.push_notifications_dlq.arn
    maxReceiveCount     = 3
  })

  # Message retention and visibility
  message_retention_seconds  = 86400  # 24 hours
  visibility_timeout_seconds = 30

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "push"
    ManagedBy   = "terraform"
  }
}

# Dead letter queue for push notifications
resource "aws_sqs_queue" "push_notifications_dlq" {
  name = "${var.push_queue_name}-dlq"

  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Type        = "push-dlq"
    ManagedBy   = "terraform"
  }
}

# SNS Topic subscriptions to SQS queues
resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.fintech_notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.email_notifications.arn

  filter_policy = jsonencode({
    notification_type = ["email"]
  })
}

resource "aws_sns_topic_subscription" "sms_subscription" {
  topic_arn = aws_sns_topic.fintech_notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sms_notifications.arn

  filter_policy = jsonencode({
    notification_type = ["sms"]
  })
}

resource "aws_sns_topic_subscription" "push_subscription" {
  topic_arn = aws_sns_topic.fintech_notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.push_notifications.arn

  filter_policy = jsonencode({
    notification_type = ["push"]
  })
}

# S3 Bucket for artifacts and file storage
resource "aws_s3_bucket" "fintech_artifacts" {
  bucket = var.s3_bucket_name

  tags = {
    Environment = var.environment
    Project     = "fintech"
    Purpose     = "artifacts"
    ManagedBy   = "terraform"
  }
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "fintech_artifacts_versioning" {
  bucket = aws_s3_bucket.fintech_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "fintech_artifacts_encryption" {
  bucket = aws_s3_bucket.fintech_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket public access block
resource "aws_s3_bucket_public_access_block" "fintech_artifacts_pab" {
  bucket = aws_s3_bucket.fintech_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Policy for services to access SQS/SNS/S3
resource "aws_iam_policy" "fintech_services_policy" {
  name        = "fintech-services-policy"
  description = "Policy allowing fintech services to access messaging and storage resources"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.email_notifications.arn,
          aws_sqs_queue.sms_notifications.arn,
          aws_sqs_queue.push_notifications.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sns:Subscribe",
          "sns:Unsubscribe"
        ]
        Resource = aws_sns_topic.fintech_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.fintech_artifacts.arn,
          "${aws_s3_bucket.fintech_artifacts.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "fintech"
    ManagedBy   = "terraform"
  }
}

# IAM User for services
resource "aws_iam_user" "fintech_services_user" {
  name = "fintech-services-user"

  tags = {
    Environment = var.environment
    Project     = "fintech"
    ManagedBy   = "terraform"
  }
}

# Attach policy to user
resource "aws_iam_user_policy_attachment" "fintech_services_attachment" {
  user       = aws_iam_user.fintech_services_user.name
  policy_arn = aws_iam_policy.fintech_services_policy.arn
}
