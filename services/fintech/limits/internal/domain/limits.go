package domain

import (
	"errors"
	"time"
)

// LimitType represents different types of limits
type LimitType string

const (
	DailyLimit   LimitType = "DAILY"
	MonthlyLimit LimitType = "MONTHLY"
)

// Limit represents a spending limit for an account
type Limit struct {
	ID          string    `json:"id"`
	AccountID   string    `json:"account_id"`
	Type        LimitType `json:"type"`
	Amount      float64   `json:"amount"`
	Used        float64   `json:"used"`
	Currency    string    `json:"currency"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// NewLimit creates a new limit with default values
func NewLimit(accountID string, limitType LimitType, amount float64, currency string) (*Limit, error) {
	if accountID == "" {
		return nil, errors.New("account ID cannot be empty")
	}
	if amount <= 0 {
		return nil, errors.New("limit amount must be positive")
	}
	if currency == "" {
		return nil, errors.New("currency cannot be empty")
	}

	now := time.Now().UTC()
	var periodStart, periodEnd time.Time

	switch limitType {
	case DailyLimit:
		periodStart = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		periodEnd = periodStart.AddDate(0, 0, 1).Add(-time.Nanosecond)
	case MonthlyLimit:
		periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		periodEnd = periodStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
	default:
		return nil, errors.New("invalid limit type")
	}

	return &Limit{
		AccountID:   accountID,
		Type:        limitType,
		Amount:      amount,
		Used:        0,
		Currency:    currency,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// CanSpend checks if a transaction amount can be spent within the limit
func (l *Limit) CanSpend(amount float64) bool {
	return l.Used+amount <= l.Amount
}

// Spend deducts amount from the available limit
func (l *Limit) Spend(amount float64) error {
	if amount <= 0 {
		return errors.New("spend amount must be positive")
	}
	if !l.CanSpend(amount) {
		return errors.New("insufficient limit")
	}

	l.Used += amount
	l.UpdatedAt = time.Now().UTC()
	return nil
}

// GetRemaining returns the remaining available limit
func (l *Limit) GetRemaining() float64 {
	if l.Used > l.Amount {
		return 0
	}
	return l.Amount - l.Used
}

// IsExpired checks if the limit period has expired
func (l *Limit) IsExpired() bool {
	return time.Now().UTC().After(l.PeriodEnd)
}

// Reset resets the used amount to zero (for new periods)
func (l *Limit) Reset() {
	l.Used = 0
	l.UpdatedAt = time.Now().UTC()
}

// LimitCheckResult represents the result of a limit check
type LimitCheckResult struct {
	Allowed       bool    `json:"allowed"`
	Remaining     float64 `json:"remaining"`
	LimitAmount   float64 `json:"limit_amount"`
	UsedAmount    float64 `json:"used_amount"`
	LimitType     string  `json:"limit_type"`
	AccountID     string  `json:"account_id"`
	ErrorMessage  string  `json:"error_message,omitempty"`
}

// NewLimitCheckResult creates a new limit check result
func NewLimitCheckResult(allowed bool, limit *Limit, errorMessage string) *LimitCheckResult {
	result := &LimitCheckResult{
		Allowed:     allowed,
		LimitType:   string(limit.Type),
		AccountID:   limit.AccountID,
		LimitAmount: limit.Amount,
		UsedAmount:  limit.Used,
		Remaining:   limit.GetRemaining(),
	}

	if !allowed && errorMessage != "" {
		result.ErrorMessage = errorMessage
	}

	return result
}
