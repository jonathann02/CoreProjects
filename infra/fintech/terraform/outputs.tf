output "sns_topic_arn" {
  description = "ARN of the SNS topic for notifications"
  value       = aws_sns_topic.fintech_notifications.arn
}

output "email_queue_url" {
  description = "URL of the email notifications SQS queue"
  value       = aws_sqs_queue.email_notifications.url
}

output "email_queue_arn" {
  description = "ARN of the email notifications SQS queue"
  value       = aws_sqs_queue.email_notifications.arn
}

output "sms_queue_url" {
  description = "URL of the SMS notifications SQS queue"
  value       = aws_sqs_queue.sms_notifications.url
}

output "sms_queue_arn" {
  description = "ARN of the SMS notifications SQS queue"
  value       = aws_sqs_queue.sms_notifications.arn
}

output "push_queue_url" {
  description = "URL of the push notifications SQS queue"
  value       = aws_sqs_queue.push_notifications.url
}

output "push_queue_arn" {
  description = "ARN of the push notifications SQS queue"
  value       = aws_sqs_queue.push_notifications.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for artifacts"
  value       = aws_s3_bucket.fintech_artifacts.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for artifacts"
  value       = aws_s3_bucket.fintech_artifacts.arn
}

output "iam_user_name" {
  description = "Name of the IAM user for services"
  value       = aws_iam_user.fintech_services_user.name
}

output "iam_user_arn" {
  description = "ARN of the IAM user for services"
  value       = aws_iam_user.fintech_services_user.arn
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for services"
  value       = aws_iam_policy.fintech_services_policy.arn
}
