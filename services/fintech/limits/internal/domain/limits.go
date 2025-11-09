package domain

import (
	"errors"
	"fmt"
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

// ScoringResult represents the result of a credit scoring evaluation
type ScoringResult struct {
	Score       int     `json:"score"`        // Score from 0-1000
	Grade       string  `json:"grade"`        // A, B, C, D, F
	RiskLevel   string  `json:"risk_level"`   // Low, Medium, High, Very High
	Approved    bool    `json:"approved"`     // Whether the application is approved
	MaxAmount   float64 `json:"max_amount"`   // Maximum approved amount
	Reason      string  `json:"reason"`       // Reason for decision
	CalculatedAt time.Time `json:"calculated_at"`
}

// ScoringService provides credit scoring functionality
type ScoringService struct{}

// NewScoringService creates a new scoring service
func NewScoringService() *ScoringService {
	return &ScoringService{}
}

// AuditEntry represents an audit log entry
type AuditEntry struct {
	ID          string    `json:"id"`
	EventType   string    `json:"event_type"`
	AccountID   string    `json:"account_id"`
	UserID      string    `json:"user_id,omitempty"`
	Action      string    `json:"action"`
	Resource    string    `json:"resource"`
	Details     string    `json:"details"`
	IPAddress   string    `json:"ip_address,omitempty"`
	UserAgent   string    `json:"user_agent,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	Severity    string    `json:"severity"` // INFO, WARN, ERROR
}

// AuditService provides audit logging functionality
type AuditService struct{}

// NewAuditService creates a new audit service
func NewAuditService() *AuditService {
	return &AuditService{}
}

// LogAction logs an audit action
func (a *AuditService) LogAction(eventType, accountID, userID, action, resource, details, ipAddress, userAgent, severity string) *AuditEntry {
	return &AuditEntry{
		ID:        generateID(),
		EventType: eventType,
		AccountID: accountID,
		UserID:    userID,
		Action:    action,
		Resource:  resource,
		Details:   details,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Timestamp: time.Now().UTC(),
		Severity:  severity,
	}
}

// generateID generates a simple ID for audit entries
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// EvaluateScore performs credit scoring evaluation (stub implementation)
func (s *ScoringService) EvaluateScore(accountID string, requestedAmount float64, accountAgeDays int, previousPayments int) *ScoringResult {
	now := time.Now().UTC()

	// Simple scoring algorithm (stub - in production, this would integrate with credit bureaus, ML models, etc.)
	baseScore := 500 // Starting score

	// Account age factor (newer accounts = higher risk)
	if accountAgeDays < 30 {
		baseScore -= 100
	} else if accountAgeDays > 365 {
		baseScore += 50
	}

	// Previous payments factor (more payments = lower risk)
	if previousPayments > 10 {
		baseScore += 100
	} else if previousPayments > 5 {
		baseScore += 50
	} else if previousPayments == 0 {
		baseScore -= 50
	}

	// Amount factor (higher amounts = higher risk)
	if requestedAmount > 10000 {
		baseScore -= 50
	} else if requestedAmount < 1000 {
		baseScore += 25
	}

	// Ensure score is within bounds
	if baseScore > 850 {
		baseScore = 850
	} else if baseScore < 300 {
		baseScore = 300
	}

	// Determine grade and risk level
	var grade, riskLevel string
	var approved bool
	var maxAmount float64
	var reason string

	switch {
	case baseScore >= 750:
		grade = "A"
		riskLevel = "Low"
		approved = true
		maxAmount = requestedAmount * 1.5
		reason = "Excellent credit profile"
	case baseScore >= 650:
		grade = "B"
		riskLevel = "Low"
		approved = true
		maxAmount = requestedAmount * 1.2
		reason = "Good credit profile"
	case baseScore >= 550:
		grade = "C"
		riskLevel = "Medium"
		approved = requestedAmount <= 5000
		if approved {
			maxAmount = requestedAmount
			reason = "Moderate credit profile"
		} else {
			reason = "Amount exceeds approved limit for credit score"
		}
	case baseScore >= 450:
		grade = "D"
		riskLevel = "High"
		approved = requestedAmount <= 1000
		if approved {
			maxAmount = requestedAmount * 0.5
			reason = "Below average credit profile"
		} else {
			reason = "Insufficient credit score for requested amount"
		}
	default:
		grade = "F"
		riskLevel = "Very High"
		approved = false
		reason = "Poor credit profile - application declined"
	}

	return &ScoringResult{
		Score:        baseScore,
		Grade:        grade,
		RiskLevel:    riskLevel,
		Approved:     approved,
		MaxAmount:    maxAmount,
		Reason:       reason,
		CalculatedAt: now,
	}
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
