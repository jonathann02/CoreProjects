package config

import (
	"time"

	"github.com/kelseyhightower/envconfig"
)

// Config holds all configuration for the limits service
type Config struct {
	// Service configuration
	ServiceName  string `envconfig:"SERVICE_NAME" default:"limits-service"`
	Port         int    `envconfig:"PORT" default:"8080"`
	Environment  string `envconfig:"ENVIRONMENT" default:"development"`

	// Database configuration
	DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`

	// Kafka configuration
	KafkaBrokers string `envconfig:"KAFKA_BROKERS" default:"localhost:9092"`

	// OpenTelemetry configuration
	OTLPEndpoint string `envconfig:"OTEL_EXPORTER_OTLP_ENDPOINT" default:"http://otel-collector:4318"`

	// Limits configuration
	DefaultDailyLimit   float64       `envconfig:"DEFAULT_DAILY_LIMIT" default:"10000"`
	DefaultMonthlyLimit float64       `envconfig:"DEFAULT_MONTHLY_LIMIT" default:"50000"`
	LimitCheckTimeout   time.Duration `envconfig:"LIMIT_CHECK_TIMEOUT" default:"5s"`

	// Redis configuration (for future distributed locking)
	RedisURL string `envconfig:"REDIS_URL" default:"redis://localhost:6379"`
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}
