package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"text/template"
	"time"

	"fintech/notifications-service/internal/config"
	"fintech/notifications-service/internal/domain"
	"fintech/notifications-service/internal/infrastructure"
	"fintech/notifications-service/pkg/aws"
	"fintech/notifications-service/pkg/database"
	"fintech/notifications-service/pkg/kafka"
	"fintech/notifications-service/pkg/otel"

	"github.com/sirupsen/logrus"
)

// NotificationService handles notification business logic
type NotificationService struct {
	repo      *infrastructure.NotificationRepository
	snsClient *aws.SNSClient
	sqsClient *aws.SQSClient
	config    *config.Config
}

// NewNotificationService creates a new notification service
func NewNotificationService(db *database.DB, snsClient *aws.SNSClient, sqsClient *aws.SQSClient, config *config.Config) *NotificationService {
	return &NotificationService{
		repo:      infrastructure.NewNotificationRepository(db),
		snsClient: snsClient,
		sqsClient: sqsClient,
		config:    config,
	}
}

// HandlePaymentEvent handles payment events from Kafka
func (s *NotificationService) HandlePaymentEvent(event *kafka.PaymentInitiatedEvent) error {
	ctx, span := otel.StartSpan(context.Background(), "HandlePaymentEvent")
	defer span.End()

	otel.AddSpanAttributes(span,
		otel.Attribute("event_id", event.PaymentID),
		otel.Attribute("event_type", "PaymentEvent"),
		otel.Attribute("amount", event.Amount),
	)

	logrus.WithFields(logrus.Fields{
		"payment_id": event.PaymentID,
		"amount":     event.Amount,
		"account_id": event.FromAccountID,
	}).Info("Processing payment event for notifications")

	// Create notifications for all supported types
	notificationTypes := []domain.NotificationType{
		domain.EmailNotification,
		domain.SMSNotification,
		domain.PushNotification,
	}

	for _, notificationType := range notificationTypes {
		if err := s.createAndSendNotification(ctx, event, notificationType); err != nil {
			logrus.WithError(err).WithFields(logrus.Fields{
				"payment_id":        event.PaymentID,
				"notification_type": notificationType,
			}).Error("Failed to create notification")
			// Continue with other notification types
		}
	}

	return nil
}

// createAndSendNotification creates and sends a notification for a specific type
func (s *NotificationService) createAndSendNotification(ctx context.Context, event *kafka.PaymentInitiatedEvent, notificationType domain.NotificationType) error {
	// Get template for this event type and notification type
	template := domain.GetTemplate("PaymentInitiated", notificationType)
	if template == nil {
		return fmt.Errorf("no template found for event type PaymentInitiated and notification type %s", notificationType)
	}

	// Prepare template data
	templateData := struct {
		PaymentID string
		Amount    float64
		Currency  string
		AccountID string
	}{
		PaymentID: event.PaymentID,
		Amount:    event.Amount,
		Currency:  event.Currency,
		AccountID: event.FromAccountID,
	}

	// Render subject and body using templates
	subject, err := s.renderTemplate(template.SubjectTemplate, templateData)
	if err != nil {
		return fmt.Errorf("failed to render subject template: %w", err)
	}

	body, err := s.renderTemplate(template.BodyTemplate, templateData)
	if err != nil {
		return fmt.Errorf("failed to render body template: %w", err)
	}

	// Get recipient based on notification type
	recipient, err := s.getRecipient(event, notificationType)
	if err != nil {
		return fmt.Errorf("failed to get recipient: %w", err)
	}

	// Create notification
	notification, err := domain.NewNotification(
		event.PaymentID,
		"PaymentInitiated",
		notificationType,
		recipient,
		subject,
		body,
		template.Priority,
		template.MaxRetries,
	)
	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	// Save notification to database
	if err := s.repo.Save(ctx, notification); err != nil {
		return fmt.Errorf("failed to save notification: %w", err)
	}

	// Send notification asynchronously
	go s.sendNotification(notification)

	return nil
}

// sendNotification sends a notification via SNS/SQS
func (s *NotificationService) sendNotification(notification *domain.Notification) {
	ctx, cancel := context.WithTimeout(context.Background(), s.config.NotificationTimeout)
	defer cancel()

	defer func() {
		if err := s.repo.Save(ctx, notification); err != nil {
			logrus.WithError(err).WithField("notification_id", notification.ID).Error("Failed to save notification after send")
		}
	}()

	// Publish to SNS topic
	if err := s.snsClient.PublishNotification(notification); err != nil {
		logrus.WithError(err).WithField("notification_id", notification.ID).Error("Failed to publish to SNS")

		// Mark for retry if possible
		if notification.CanRetry() {
			if err := notification.MarkForRetry(s.config.RetryDelay, err.Error()); err != nil {
				notification.MarkAsFailed("Max retries exceeded: " + err.Error())
			}
		} else {
			notification.MarkAsFailed("Failed to publish to SNS: " + err.Error())
		}
		return
	}

	// Mark as sent
	notification.MarkAsSent()

	// Send to appropriate SQS queue for processing
	queueURL := s.getQueueURL(notification.Type)
	if queueURL != "" {
		if err := s.sqsClient.SendMessage(queueURL, notification); err != nil {
			logrus.WithError(err).WithField("notification_id", notification.ID).Error("Failed to send to SQS queue")
		}
	}

	logrus.WithField("notification_id", notification.ID).Info("Notification sent successfully")
}

// renderTemplate renders a template with the given data
func (s *NotificationService) renderTemplate(templateStr string, data interface{}) (string, error) {
	if templateStr == "" {
		return "", nil
	}

	tmpl, err := template.New("notification").Parse(templateStr)
	if err != nil {
		return "", err
	}

	var result strings.Builder
	if err := tmpl.Execute(&result, data); err != nil {
		return "", err
	}

	return result.String(), nil
}

// getRecipient gets the recipient for a notification type
func (s *NotificationService) getRecipient(event *kafka.PaymentInitiatedEvent, notificationType domain.NotificationType) (string, error) {
	// In a real implementation, you would look up user contact information
	// from a user service or database based on the account ID
	switch notificationType {
	case domain.EmailNotification:
		return fmt.Sprintf("user+%s@fintech.com", event.FromAccountID), nil
	case domain.SMSNotification:
		return "+1234567890", nil // Placeholder phone number
	case domain.PushNotification:
		return event.FromAccountID, nil // Device token or user ID
	default:
		return "", fmt.Errorf("unsupported notification type: %s", notificationType)
	}
}

// getQueueURL returns the SQS queue URL for a notification type
func (s *NotificationService) getQueueURL(notificationType domain.NotificationType) string {
	switch notificationType {
	case domain.EmailNotification:
		return s.config.AWSConfig.EmailQueueURL
	case domain.SMSNotification:
		return s.config.AWSConfig.SMSQueueURL
	case domain.PushNotification:
		return s.config.AWSConfig.PushQueueURL
	default:
		return ""
	}
}

// HealthCheck handles GET /health
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}
