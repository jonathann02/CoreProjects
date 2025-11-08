# FinTech Infrastructure as Code

This Terraform module sets up AWS resources in LocalStack for the FinTech platform development environment.

## Resources Created

- **SNS Topic**: `fintech-notifications` for publishing notification events
- **SQS Queues**: Separate queues for email, SMS, and push notifications with DLQs
- **S3 Bucket**: `fintech-artifacts` for storing files and artifacts
- **IAM User & Policy**: Service account with minimal required permissions

## Prerequisites

- Terraform >= 1.0
- LocalStack running on `http://localhost:4566`

## Usage

1. Initialize Terraform:
```bash
terraform init
```

2. Plan the deployment:
```bash
terraform plan
```

3. Apply the configuration:
```bash
terraform apply
```

## LocalStack Commands

After starting LocalStack with Docker Compose, you can also use these commands:

```bash
# List SNS topics
awslocal sns list-topics

# List SQS queues
awslocal sqs list-queues

# List S3 buckets
awslocal s3 ls

# View Terraform outputs
terraform output
```

## Configuration

The module uses the following variables (defined in `terraform.tfvars`):

- `aws_region`: AWS region (default: us-east-1)
- `localstack_endpoint`: LocalStack endpoint URL
- `environment`: Environment name
- `sns_topic_name`: Name of the SNS topic
- `*_queue_name`: Names of the SQS queues
- `s3_bucket_name`: Name of the S3 bucket

## Outputs

The module provides the following outputs:

- `sns_topic_arn`: ARN of the notifications SNS topic
- `*_queue_url` & `*_queue_arn`: URLs and ARNs of SQS queues
- `s3_bucket_name` & `s3_bucket_arn`: S3 bucket details
- `iam_user_*`: IAM user information

## Security Notes

- All resources are configured with appropriate security settings
- S3 bucket has public access blocked and encryption enabled
- SQS queues have dead letter queues configured
- IAM policy follows principle of least privilege
