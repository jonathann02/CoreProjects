package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"github.com/sirupsen/logrus"
)

// PaymentInitiatedEvent represents a payment initiation event
type PaymentInitiatedEvent struct {
	PaymentID    string  `json:"paymentId"`
	IdempotencyKey string `json:"idempotencyKey"`
	FromAccountID string `json:"fromAccountId"`
	ToAccountID   string `json:"toAccountId"`
	Amount        float64 `json:"amount"`
	Currency      string `json:"currency"`
}

// Consumer handles Kafka message consumption
type Consumer struct {
	reader *kafka.Reader
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(brokers string, groupID string, topic string) (*Consumer, error) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{brokers},
		GroupID:     groupID,
		Topic:       topic,
		MinBytes:    10e3, // 10KB
		MaxBytes:    10e6, // 10MB
		StartOffset: kafka.LastOffset, // Start from the end
	})

	return &Consumer{reader: reader}, nil
}

// Start begins consuming messages and calls the handler for each message
func (c *Consumer) Start(ctx context.Context, handler func(event *PaymentInitiatedEvent) error) error {
	logrus.WithField("topic", c.reader.Config().Topic).Info("Starting Kafka consumer")

	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping Kafka consumer")
			return ctx.Err()
		default:
			message, err := c.reader.ReadMessage(ctx)
			if err != nil {
				logrus.WithError(err).Error("Failed to read message from Kafka")
				continue
			}

			// Parse the event
			var event PaymentInitiatedEvent
			if err := json.Unmarshal(message.Value, &event); err != nil {
				logrus.WithError(err).WithField("message", string(message.Value)).Error("Failed to unmarshal payment event")
				continue
			}

			// Handle the event
			if err := handler(&event); err != nil {
				logrus.WithError(err).WithField("event", event).Error("Failed to handle payment event")
				// In production, you might want to send to a dead letter queue
				continue
			}

			logrus.WithFields(logrus.Fields{
				"payment_id": event.PaymentID,
				"offset":     message.Offset,
			}).Debug("Successfully processed payment event")
		}
	}
}

// Close closes the Kafka consumer
func (c *Consumer) Close() error {
	logrus.Info("Closing Kafka consumer")
	return c.reader.Close()
}
