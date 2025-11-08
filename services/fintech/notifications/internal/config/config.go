package config

import (
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/kelseyhightower/envconfig"
)

// AWSConfig holds AWS configuration
type AWSConfig struct {
	Endpoint        string `envconfig:"AWS_ENDPOINT_URL" default:"http://localhost:4566"`
	Region          string `envconfig:"AWS_REGION" default:"us-east-1"`
	AccessKeyID     string `envconfig:"AWS_ACCESS_KEY_ID" default:"test"`
	SecretAccessKey string `envconfig:"AWS_SECRET_ACCESS_KEY" default:"test"`
	SNSTopicARN     string `envconfig:"SNS_TOPIC_ARN" default:"arn:aws:sns:us-east-1:000000000000:fintech-notifications"`
	EmailQueueURL   string `envconfig:"EMAIL_QUEUE_URL" default:"http://localhost:4566/000000000000/fintech-email-notifications"`
	SMSQueueURL     string `envconfig:"SMS_QUEUE_URL" default:"http://localhost:4566/000000000000/fintech-sms-notifications"`
	PushQueueURL    string `envconfig:"PUSH_QUEUE_URL" default:"http://localhost:4566/000000000000/fintech-push-notifications"`
}

// ToAWSConfig converts to aws.Config
func (c *AWSConfig) ToAWSConfig() *aws.Config {
	return &aws.Config{
		Endpoint:   &c.Endpoint,
		Region:     &c.Region,
		DisableSSL: aws.Bool(true),
	}
}

// Config holds all configuration for the notifications service
type Config struct {
	// Service configuration
	ServiceName  string `envconfig:"SERVICE_NAME" default:"notifications-service"`
	Port         int    `envconfig:"PORT" default:"8080"`
	Environment  string `envconfig:"ENVIRONMENT" default:"development"`

	// Database configuration
	DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`

	// Kafka configuration
	KafkaBrokers string `envconfig:"KAFKA_BROKERS" default:"localhost:9092"`

	// AWS configuration
	AWSConfig AWSConfig

	// OpenTelemetry configuration
	OTLPEndpoint string `envconfig:"OTEL_EXPORTER_OTLP_ENDPOINT" default:"http://otel-collector:4318"`

	// Notification configuration
	MaxRetries        int           `envconfig:"MAX_RETRIES" default:"3"`
	RetryDelay        time.Duration `envconfig:"RETRY_DELAY" default:"5s"`
	NotificationTimeout time.Duration `envconfig:"NOTIFICATION_TIMEOUT" default:"30s"`
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return nil, err
	}

	// Load AWS config separately
	err = envconfig.Process("", &cfg.AWSConfig)
	if err != nil {
		return nil, err
	}

	return &cfg, nil
}
