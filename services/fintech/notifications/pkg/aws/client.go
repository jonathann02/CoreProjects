package aws

import (
	"encoding/json"
	"fmt"

	"fintech/notifications-service/internal/domain"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sns"
	"github.com/aws/aws-sdk-go/service/sqs"
	"github.com/sirupsen/logrus"
)

// SNSClient handles SNS operations
type SNSClient struct {
	client   *sns.SNS
	topicARN string
}

// NewSNSClient creates a new SNS client
func NewSNSClient(config *aws.Config) (*SNSClient, error) {
	sess, err := session.NewSession(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	client := sns.New(sess)

	// Extract topic ARN from config (this would be injected)
	topicARN := config.Endpoint // This should be properly configured

	return &SNSClient{
		client:   client,
		topicARN: topicARN,
	}, nil
}

// PublishNotification publishes a notification to SNS with message attributes for filtering
func (c *SNSClient) PublishNotification(notification *domain.Notification) error {
	messageBytes, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	message := string(messageBytes)

	// Create message attributes for filtering
	messageAttributes := map[string]*sns.MessageAttributeValue{
		"notification_type": {
			DataType:    aws.String("String"),
			StringValue: aws.String(string(notification.Type)),
		},
		"event_type": {
			DataType:    aws.String("String"),
			StringValue: aws.String(notification.EventType),
		},
		"priority": {
			DataType:    aws.String("Number"),
			StringValue: aws.String(fmt.Sprintf("%d", notification.Priority)),
		},
	}

	input := &sns.PublishInput{
		TopicArn:          aws.String(c.topicARN),
		Message:           aws.String(message),
		MessageAttributes: messageAttributes,
	}

	_, err = c.client.Publish(input)
	if err != nil {
		return fmt.Errorf("failed to publish to SNS: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"notification_id": notification.ID,
		"type":           notification.Type,
		"event_type":     notification.EventType,
	}).Debug("Published notification to SNS")

	return nil
}

// SQSClient handles SQS operations
type SQSClient struct {
	client *sqs.SQS
}

// NewSQSClient creates a new SQS client
func NewSQSClient(config *aws.Config) (*SQSClient, error) {
	sess, err := session.NewSession(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	client := sqs.New(sess)

	return &SQSClient{
		client: client,
	}, nil
}

// SendMessage sends a message to an SQS queue
func (c *SQSClient) SendMessage(queueURL string, notification *domain.Notification) error {
	messageBytes, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	messageBody := string(messageBytes)

	input := &sqs.SendMessageInput{
		QueueUrl:    aws.String(queueURL),
		MessageBody: aws.String(messageBody),
		MessageAttributes: map[string]*sqs.MessageAttributeValue{
			"notification_type": {
				DataType:    aws.String("String"),
				StringValue: aws.String(string(notification.Type)),
			},
			"event_type": {
				DataType:    aws.String("String"),
				StringValue: aws.String(notification.EventType),
			},
		},
	}

	_, err = c.client.SendMessage(input)
	if err != nil {
		return fmt.Errorf("failed to send message to SQS: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"notification_id": notification.ID,
		"queue_url":      queueURL,
		"type":          notification.Type,
	}).Debug("Sent notification to SQS queue")

	return nil
}

// ReceiveMessages receives messages from an SQS queue (for processing notifications)
func (c *SQSClient) ReceiveMessages(queueURL string, maxMessages int64) ([]*sqs.Message, error) {
	input := &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: aws.Int64(maxMessages),
		WaitTimeSeconds:     aws.Int64(20), // Long polling
		VisibilityTimeout:   aws.Int64(30), // 30 seconds
	}

	result, err := c.client.ReceiveMessage(input)
	if err != nil {
		return nil, fmt.Errorf("failed to receive messages from SQS: %w", err)
	}

	return result.Messages, nil
}

// DeleteMessage deletes a processed message from the queue
func (c *SQSClient) DeleteMessage(queueURL, receiptHandle string) error {
	input := &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(queueURL),
		ReceiptHandle: aws.String(receiptHandle),
	}

	_, err := c.client.DeleteMessage(input)
	if err != nil {
		return fmt.Errorf("failed to delete message from SQS: %w", err)
	}

	logrus.Debug("Deleted message from SQS queue")
	return nil
}
