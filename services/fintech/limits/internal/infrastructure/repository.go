package infrastructure

import (
	"context"
	"fmt"
	"time"

	"fintech/limits-service/internal/domain"
	"fintech/limits-service/pkg/database"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// LimitRepository handles database operations for limits
type LimitRepository struct {
	db *database.DB
}

// NewLimitRepository creates a new limit repository
func NewLimitRepository(db *database.DB) *LimitRepository {
	return &LimitRepository{db: db}
}

// GetOrCreateLimit gets an existing limit or creates a new one for the account and period
func (r *LimitRepository) GetOrCreateLimit(ctx context.Context, accountID string, limitType domain.LimitType, defaultAmount float64, currency string) (*domain.Limit, error) {
	// First try to find existing limit for current period
	limit, err := r.getCurrentLimit(ctx, accountID, limitType)
	if err != nil {
		return nil, err
	}

	if limit != nil {
		return limit, nil
	}

	// Create new limit if none exists
	newLimit, err := domain.NewLimit(accountID, limitType, defaultAmount, currency)
	if err != nil {
		return nil, err
	}

	return r.saveLimit(ctx, newLimit)
}

// GetCurrentLimit gets the current limit for an account and type
func (r *LimitRepository) GetCurrentLimit(ctx context.Context, accountID string, limitType domain.LimitType) (*domain.Limit, error) {
	return r.getCurrentLimit(ctx, accountID, limitType)
}

// UpdateLimit updates a limit in the database
func (r *LimitRepository) UpdateLimit(ctx context.Context, limit *domain.Limit) error {
	query := `
		UPDATE limits
		SET used = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, limit.Used, limit.UpdatedAt, limit.ID)
	if err != nil {
		return fmt.Errorf("failed to update limit: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"limit_id": limit.ID,
		"used":     limit.Used,
	}).Debug("Limit updated")

	return nil
}

// CheckAndSpend attempts to spend from the limit if allowed
func (r *LimitRepository) CheckAndSpend(ctx context.Context, accountID string, limitType domain.LimitType, amount float64, defaultLimit float64, currency string) (*domain.LimitCheckResult, error) {
	// Get or create limit
	limit, err := r.GetOrCreateLimit(ctx, accountID, limitType, defaultLimit, currency)
	if err != nil {
		return nil, fmt.Errorf("failed to get/create limit: %w", err)
	}

	// Check if spending is allowed
	if !limit.CanSpend(amount) {
		return domain.NewLimitCheckResult(false, limit, "Limit exceeded"), nil
	}

	// Spend from limit
	if err := limit.Spend(amount); err != nil {
		return nil, fmt.Errorf("failed to spend from limit: %w", err)
	}

	// Update in database
	if err := r.UpdateLimit(ctx, limit); err != nil {
		return nil, fmt.Errorf("failed to update limit in database: %w", err)
	}

	return domain.NewLimitCheckResult(true, limit, ""), nil
}

// ResetExpiredLimits resets limits that have expired (should be called periodically)
func (r *LimitRepository) ResetExpiredLimits(ctx context.Context) error {
	query := `
		UPDATE limits
		SET used = 0, updated_at = CURRENT_TIMESTAMP
		WHERE period_end < CURRENT_TIMESTAMP AND used > 0
	`

	result, err := r.db.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to reset expired limits: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected > 0 {
		logrus.WithField("count", rowsAffected).Info("Reset expired limits")
	}

	return nil
}

func (r *LimitRepository) getCurrentLimit(ctx context.Context, accountID string, limitType domain.LimitType) (*domain.Limit, error) {
	query := `
		SELECT id, account_id, type, amount, used, currency, period_start, period_end, created_at, updated_at
		FROM limits
		WHERE account_id = $1 AND type = $2 AND period_end >= CURRENT_TIMESTAMP
		ORDER BY period_end DESC
		LIMIT 1
	`

	var limit domain.Limit
	err := r.db.QueryRow(ctx, query, accountID, string(limitType)).Scan(
		&limit.ID,
		&limit.AccountID,
		&limit.Type,
		&limit.Amount,
		&limit.Used,
		&limit.Currency,
		&limit.PeriodStart,
		&limit.PeriodEnd,
		&limit.CreatedAt,
		&limit.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // No limit found
		}
		return nil, fmt.Errorf("failed to get current limit: %w", err)
	}

	return &limit, nil
}

func (r *LimitRepository) saveLimit(ctx context.Context, limit *domain.Limit) (*domain.Limit, error) {
	query := `
		INSERT INTO limits (id, account_id, type, amount, used, currency, period_start, period_end, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (account_id, type, period_start)
		DO NOTHING
		RETURNING id
	`

	limit.ID = uuid.New().String()

	err := r.db.QueryRow(ctx, query,
		limit.ID,
		limit.AccountID,
		string(limit.Type),
		limit.Amount,
		limit.Used,
		limit.Currency,
		limit.PeriodStart,
		limit.PeriodEnd,
		limit.CreatedAt,
		limit.UpdatedAt,
	).Scan(&limit.ID)

	if err != nil {
		// If conflict occurred, try to get existing limit
		if err.Error() == "no rows in result set" {
			return r.getCurrentLimit(ctx, limit.AccountID, limit.Type)
		}
		return nil, fmt.Errorf("failed to save limit: %w", err)
	}

	logrus.WithFields(logrus.Fields{
		"limit_id": limit.ID,
		"account":  limit.AccountID,
		"type":     limit.Type,
	}).Debug("Limit created")

	return limit, nil
}
