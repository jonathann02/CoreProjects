package infrastructure

import (
	"context"
	"fmt"
	"time"

	"fintech/notifications-service/internal/domain"
	"fintech/notifications-service/pkg/database"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// NotificationRepository handles database operations for notifications
type NotificationRepository struct {
	db *database.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *database.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Save saves a notification to the database
func (r *NotificationRepository) Save(ctx context.Context, notification *domain.Notification) error {
	if notification.ID == "" {
		notification.ID = uuid.New().String()
	}

	query := `
		INSERT INTO notifications (id, event_id, event_type, type, recipient, subject, body, status, priority, retry_count, max_retries, next_retry_at, error, created_at, updated_at, sent_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (id)
		DO UPDATE SET
			status = EXCLUDED.status,
			retry_count = EXCLUDED.retry_count,
			next_retry_at = EXCLUDED.next_retry_at,
			error = EXCLUDED.error,
			updated_at = EXCLUDED.updated_at,
			sent_at = EXCLUDED.sent_at
	`

	var sentAt *time.Time
	if notification.SentAt != nil {
		sentAt = notification.SentAt
	}

	_, err := r.db.Exec(ctx, query,
		notification.ID,
		notification.EventID,
		notification.EventType,
		string(notification.Type),
		notification.Recipient,
		notification.Subject,
		notification.Body,
		string(notification.Status),
		notification.Priority,
		notification.RetryCount,
		notification.MaxRetries,
		notification.NextRetryAt,
		notification.Error,
		notification.CreatedAt,
		notification.UpdatedAt,
		sentAt,
	)

	if err != nil {
		return fmt.Errorf("failed to save notification: %w", err)
	}

	logrus.WithField("notification_id", notification.ID).Debug("Notification saved")
	return nil
}

// FindByID finds a notification by ID
func (r *NotificationRepository) FindByID(ctx context.Context, id string) (*domain.Notification, error) {
	query := `
		SELECT id, event_id, event_type, type, recipient, subject, body, status, priority, retry_count, max_retries, next_retry_at, error, created_at, updated_at, sent_at
		FROM notifications
		WHERE id = $1
	`

	var notification domain.Notification
	var sentAt *time.Time

	err := r.db.QueryRow(ctx, query, id).Scan(
		&notification.ID,
		&notification.EventID,
		&notification.EventType,
		&notification.Type,
		&notification.Recipient,
		&notification.Subject,
		&notification.Body,
		&notification.Status,
		&notification.Priority,
		&notification.RetryCount,
		&notification.MaxRetries,
		&notification.NextRetryAt,
		&notification.Error,
		&notification.CreatedAt,
		&notification.UpdatedAt,
		&sentAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, fmt.Errorf("notification not found: %s", id)
		}
		return nil, fmt.Errorf("failed to find notification: %w", err)
	}

	notification.SentAt = sentAt
	return &notification, nil
}

// FindPendingNotifications finds notifications that are ready for processing
func (r *NotificationRepository) FindPendingNotifications(ctx context.Context, limit int) ([]*domain.Notification, error) {
	query := `
		SELECT id, event_id, event_type, type, recipient, subject, body, status, priority, retry_count, max_retries, next_retry_at, error, created_at, updated_at, sent_at
		FROM notifications
		WHERE status = 'PENDING'
		AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
		ORDER BY priority DESC, created_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending notifications: %w", err)
	}
	defer rows.Close()

	var notifications []*domain.Notification
	for rows.Next() {
		var notification domain.Notification
		var sentAt *time.Time

		err := rows.Scan(
			&notification.ID,
			&notification.EventID,
			&notification.EventType,
			&notification.Type,
			&notification.Recipient,
			&notification.Subject,
			&notification.Body,
			&notification.Status,
			&notification.Priority,
			&notification.RetryCount,
			&notification.MaxRetries,
			&notification.NextRetryAt,
			&notification.Error,
			&notification.CreatedAt,
			&notification.UpdatedAt,
			&sentAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}

		notification.SentAt = sentAt
		notifications = append(notifications, &notification)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating notifications: %w", err)
	}

	return notifications, nil
}

// UpdateStatus updates the status of a notification
func (r *NotificationRepository) UpdateStatus(ctx context.Context, id string, status domain.NotificationStatus, errorMsg string) error {
	query := `
		UPDATE notifications
		SET status = $1, error = $2, updated_at = CURRENT_TIMESTAMP,
		    sent_at = CASE WHEN $1 = 'SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, string(status), errorMsg, id)
	if err != nil {
		return fmt.Errorf("failed to update notification status: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"notification_id": id,
		"status":         status,
	}).Debug("Notification status updated")

	return nil
}

// GetNotificationStats returns statistics about notifications
func (r *NotificationRepository) GetNotificationStats(ctx context.Context) (map[string]int, error) {
	query := `
		SELECT status, COUNT(*) as count
		FROM notifications
		GROUP BY status
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification stats: %w", err)
	}
	defer rows.Close()

	stats := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("failed to scan stats: %w", err)
		}
		stats[status] = count
	}

	return stats, nil
}
