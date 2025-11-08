package domain

import (
	"errors"
	"time"
)

// NotificationType represents different types of notifications
type NotificationType string

const (
	EmailNotification NotificationType = "EMAIL"
	SMSNotification   NotificationType = "SMS"
	PushNotification  NotificationType = "PUSH"
)

// NotificationStatus represents the status of a notification
type NotificationStatus string

const (
	PendingStatus   NotificationStatus = "PENDING"
	SentStatus      NotificationStatus = "SENT"
	FailedStatus    NotificationStatus = "FAILED"
	DeliveredStatus NotificationStatus = "DELIVERED"
)

// Notification represents a notification to be sent
type Notification struct {
	ID          string             `json:"id"`
	EventID     string             `json:"event_id"`
	EventType   string             `json:"event_type"`
	Type        NotificationType   `json:"type"`
	Recipient   string             `json:"recipient"`
	Subject     string             `json:"subject,omitempty"`
	Body        string             `json:"body"`
	Status      NotificationStatus `json:"status"`
	Priority    int                `json:"priority"`
	RetryCount  int                `json:"retry_count"`
	MaxRetries  int                `json:"max_retries"`
	NextRetryAt *time.Time         `json:"next_retry_at,omitempty"`
	Error       string             `json:"error,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	SentAt      *time.Time         `json:"sent_at,omitempty"`
}

// NewNotification creates a new notification
func NewNotification(eventID, eventType string, notificationType NotificationType, recipient, subject, body string, priority int, maxRetries int) (*Notification, error) {
	if eventID == "" {
		return nil, errors.New("event ID cannot be empty")
	}
	if recipient == "" {
		return nil, errors.New("recipient cannot be empty")
	}
	if body == "" {
		return nil, errors.New("body cannot be empty")
	}

	now := time.Now().UTC()
	return &Notification{
		EventID:    eventID,
		EventType:  eventType,
		Type:       notificationType,
		Recipient:  recipient,
		Subject:    subject,
		Body:       body,
		Status:     PendingStatus,
		Priority:   priority,
		MaxRetries: maxRetries,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// MarkAsSent marks the notification as sent
func (n *Notification) MarkAsSent() {
	now := time.Now().UTC()
	n.Status = SentStatus
	n.SentAt = &now
	n.UpdatedAt = now
	n.NextRetryAt = nil
}

// MarkAsDelivered marks the notification as delivered
func (n *Notification) MarkAsDelivered() {
	n.Status = DeliveredStatus
	n.UpdatedAt = time.Now().UTC()
}

// MarkForRetry marks the notification for retry
func (n *Notification) MarkForRetry(delay time.Duration, errorMsg string) error {
	if n.RetryCount >= n.MaxRetries {
		return errors.New("max retries exceeded")
	}

	n.RetryCount++
	nextRetry := time.Now().UTC().Add(delay)
	n.NextRetryAt = &nextRetry
	n.Status = PendingStatus
	n.Error = errorMsg
	n.UpdatedAt = time.Now().UTC()

	return nil
}

// MarkAsFailed marks the notification as permanently failed
func (n *Notification) MarkAsFailed(errorMsg string) {
	n.Status = FailedStatus
	n.Error = errorMsg
	n.UpdatedAt = time.Now().UTC()
	n.NextRetryAt = nil
}

// CanRetry checks if the notification can be retried
func (n *Notification) CanRetry() bool {
	return n.Status == PendingStatus && n.RetryCount < n.MaxRetries
}

// IsReadyForRetry checks if the notification is ready for retry
func (n *Notification) IsReadyForRetry() bool {
	if n.NextRetryAt == nil {
		return false
	}
	return time.Now().UTC().After(*n.NextRetryAt)
}

// NotificationTemplate represents a template for notifications
type NotificationTemplate struct {
	EventType         string
	NotificationType  NotificationType
	SubjectTemplate   string
	BodyTemplate      string
	Priority          int
	MaxRetries        int
}

// GetTemplate returns the appropriate template for an event type and notification type
func GetTemplate(eventType string, notificationType NotificationType) *NotificationTemplate {
	templates := map[string]map[NotificationType]*NotificationTemplate{
		"PaymentInitiated": {
			EmailNotification: {
				EventType:        "PaymentInitiated",
				NotificationType: EmailNotification,
				SubjectTemplate:  "Payment Initiated - {{.PaymentID}}",
				BodyTemplate:     "Your payment of {{.Amount}} {{.Currency}} has been initiated. Payment ID: {{.PaymentID}}",
				Priority:         1,
				MaxRetries:       3,
			},
			SMSNotification: {
				EventType:        "PaymentInitiated",
				NotificationType: SMSNotification,
				BodyTemplate:     "Payment initiated: {{.Amount}} {{.Currency}}. ID: {{.PaymentID}}",
				Priority:         1,
				MaxRetries:       2,
			},
			PushNotification: {
				EventType:        "PaymentInitiated",
				NotificationType: PushNotification,
				SubjectTemplate:  "Payment Started",
				BodyTemplate:     "Your payment of {{.Amount}} {{.Currency}} is being processed",
				Priority:         1,
				MaxRetries:       2,
			},
		},
		"PaymentCompleted": {
			EmailNotification: {
				EventType:        "PaymentCompleted",
				NotificationType: EmailNotification,
				SubjectTemplate:  "Payment Completed - {{.PaymentID}}",
				BodyTemplate:     "Your payment of {{.Amount}} {{.Currency}} has been completed successfully. Payment ID: {{.PaymentID}}",
				Priority:         2,
				MaxRetries:       3,
			},
			SMSNotification: {
				EventType:        "PaymentCompleted",
				NotificationType: SMSNotification,
				BodyTemplate:     "Payment completed: {{.Amount}} {{.Currency}}. ID: {{.PaymentID}}",
				Priority:         2,
				MaxRetries:       2,
			},
			PushNotification: {
				EventType:        "PaymentCompleted",
				NotificationType: PushNotification,
				SubjectTemplate:  "Payment Successful",
				BodyTemplate:     "Payment of {{.Amount}} {{.Currency}} completed successfully",
				Priority:         2,
				MaxRetries:       2,
			},
		},
		"PaymentFailed": {
			EmailNotification: {
				EventType:        "PaymentFailed",
				NotificationType: EmailNotification,
				SubjectTemplate:  "Payment Failed - {{.PaymentID}}",
				BodyTemplate:     "Your payment of {{.Amount}} {{.Currency}} has failed. Payment ID: {{.PaymentID}}. Reason: {{.Reason}}",
				Priority:         3,
				MaxRetries:       3,
			},
			SMSNotification: {
				EventType:        "PaymentFailed",
				NotificationType: SMSNotification,
				BodyTemplate:     "Payment failed: {{.Amount}} {{.Currency}}. ID: {{.PaymentID}}. Contact support.",
				Priority:         3,
				MaxRetries:       2,
			},
			PushNotification: {
				EventType:        "PaymentFailed",
				NotificationType: PushNotification,
				SubjectTemplate:  "Payment Failed",
				BodyTemplate:     "Payment of {{.Amount}} {{.Currency}} failed. Please try again.",
				Priority:         3,
				MaxRetries:       2,
			},
		},
	}

	if eventTemplates, exists := templates[eventType]; exists {
		if template, exists := eventTemplates[notificationType]; exists {
			return template
		}
	}

	return nil
}
