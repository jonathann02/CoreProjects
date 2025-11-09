package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"fintech/limits-service/internal/config"
	"fintech/limits-service/internal/domain"
	"fintech/limits-service/internal/infrastructure"
	"fintech/limits-service/pkg/database"
	"fintech/limits-service/pkg/kafka"
	"fintech/limits-service/pkg/otel"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// LimitsHandler handles HTTP requests for limit operations
type LimitsHandler struct {
	repo          *infrastructure.LimitRepository
	scoringSvc    *domain.ScoringService
	auditSvc      *domain.AuditService
	config        *config.Config
}

// NewLimitsHandler creates a new limits handler
func NewLimitsHandler(db *database.DB) *LimitsHandler {
	return &LimitsHandler{
		repo:       infrastructure.NewLimitRepository(db),
		scoringSvc: domain.NewScoringService(),
		auditSvc:   domain.NewAuditService(),
	}
}

// SetConfig sets the configuration (called after creation)
func (h *LimitsHandler) SetConfig(cfg *config.Config) {
	h.config = cfg
}

// EvaluateLimit handles POST /limits/evaluate
func (h *LimitsHandler) EvaluateLimit(w http.ResponseWriter, r *http.Request) {
	ctx, span := otel.StartSpan(r.Context(), "EvaluateLimit")
	defer span.End()

	var req EvaluateLimitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logrus.WithError(err).Error("Failed to decode request")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	otel.AddSpanAttributes(span,
		otel.Attribute("account_id", req.AccountID),
		otel.Attribute("limit_type", req.LimitType),
		otel.Attribute("amount", req.Amount),
	)

	// Validate request
	if req.AccountID == "" || req.Amount <= 0 {
		http.Error(w, "Invalid request parameters", http.StatusBadRequest)
		return
	}

	// Determine limit type
	var limitType domain.LimitType
	switch req.LimitType {
	case "DAILY":
		limitType = domain.DailyLimit
	case "MONTHLY":
		limitType = domain.MonthlyLimit
	default:
		http.Error(w, "Invalid limit type. Must be DAILY or MONTHLY", http.StatusBadRequest)
		return
	}

	// Check limit with timeout
	checkCtx, cancel := context.WithTimeout(ctx, h.config.LimitCheckTimeout)
	defer cancel()

	result, err := h.repo.CheckAndSpend(
		checkCtx,
		req.AccountID,
		limitType,
		req.Amount,
		h.getDefaultLimit(limitType),
		req.Currency,
	)

	if err != nil {
		logrus.WithError(err).WithField("account", req.AccountID).Error("Failed to check limit")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Return result
	w.Header().Set("Content-Type", "application/json")
	if !result.Allowed {
		w.WriteHeader(http.StatusForbidden)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	if err := json.NewEncoder(w).Encode(result); err != nil {
		logrus.WithError(err).Error("Failed to encode response")
	}
}

// HandlePaymentEvent handles payment events from Kafka
func (h *LimitsHandler) HandlePaymentEvent(event *kafka.PaymentInitiatedEvent) error {
	ctx, span := otel.StartSpan(context.Background(), "HandlePaymentEvent")
	defer span.End()

	otel.AddSpanAttributes(span,
		otel.Attribute("payment_id", event.PaymentID),
		otel.Attribute("account_id", event.FromAccountID),
		otel.Attribute("amount", event.Amount),
	)

	logrus.WithFields(logrus.Fields{
		"payment_id": event.PaymentID,
		"account_id": event.FromAccountID,
		"amount":     event.Amount,
	}).Info("Processing payment event for limit check")

	// Check daily limit
	dailyResult, err := h.repo.CheckAndSpend(
		ctx,
		event.FromAccountID,
		domain.DailyLimit,
		event.Amount,
		h.config.DefaultDailyLimit,
		event.Currency,
	)
	if err != nil {
		logrus.WithError(err).WithField("payment", event.PaymentID).Error("Failed to check daily limit")
		return err
	}

	// Check monthly limit
	monthlyResult, err := h.repo.CheckAndSpend(
		ctx,
		event.FromAccountID,
		domain.MonthlyLimit,
		event.Amount,
		h.config.DefaultMonthlyLimit,
		event.Currency,
	)
	if err != nil {
		logrus.WithError(err).WithField("payment", event.PaymentID).Error("Failed to check monthly limit")
		return err
	}

	// Log limit check results
	logrus.WithFields(logrus.Fields{
		"payment_id":      event.PaymentID,
		"account_id":      event.FromAccountID,
		"daily_allowed":   dailyResult.Allowed,
		"daily_remaining": dailyResult.Remaining,
		"monthly_allowed": monthlyResult.Allowed,
		"monthly_remaining": monthlyResult.Remaining,
	}).Info("Limit check completed")

	// In a real implementation, you might publish limit check results to Kafka
	// or update payment status based on limit checks

	return nil
}

// ApplyForLoan handles POST /loans/apply
func (h *LimitsHandler) ApplyForLoan(w http.ResponseWriter, r *http.Request) {
	ctx, span := otel.StartSpan(r.Context(), "ApplyForLoan")
	defer span.End()

	var req LoanApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logrus.WithError(err).Error("Failed to decode loan application request")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	otel.AddSpanAttributes(span,
		otel.Attribute("account_id", req.AccountID),
		otel.Attribute("amount", req.Amount),
		otel.Attribute("loan_type", req.LoanType),
	)

	// Validate request
	if req.AccountID == "" || req.Amount <= 0 {
		http.Error(w, "Invalid request parameters", http.StatusBadRequest)
		return
	}

	// Get account age and payment history (stub implementation)
	accountAgeDays := h.getAccountAge(req.AccountID)
	previousPayments := h.getPreviousPayments(req.AccountID)

	// Perform credit scoring
	scoringResult := h.scoringSvc.EvaluateScore(req.AccountID, req.Amount, accountAgeDays, previousPayments)

	// Create audit entry
	auditEntry := h.auditSvc.LogAction(
		"LoanApplication",
		req.AccountID,
		req.UserID,
		"APPLY",
		"loan",
		fmt.Sprintf("Loan application for $%.2f, score: %d, approved: %v", req.Amount, scoringResult.Score, scoringResult.Approved),
		r.RemoteAddr,
		r.Header.Get("User-Agent"),
		"INFO",
	)

	logrus.WithFields(logrus.Fields{
		"account_id":   req.AccountID,
		"user_id":      req.UserID,
		"amount":       req.Amount,
		"score":        scoringResult.Score,
		"approved":     scoringResult.Approved,
		"audit_entry":  auditEntry.ID,
	}).Info("Loan application processed")

	// If approved, create/update limit
	var limitResult *domain.LimitCheckResult
	if scoringResult.Approved {
		var err error
		limitResult, err = h.repo.CheckAndSpend(
			ctx,
			req.AccountID,
			domain.MonthlyLimit, // Loan limits are typically monthly
			scoringResult.MaxAmount,
			scoringResult.MaxAmount, // Set limit to approved amount
			"USD", // Default currency
		)
		if err != nil {
			logrus.WithError(err).Error("Failed to create loan limit")
			http.Error(w, "Failed to process loan limit", http.StatusInternalServerError)
			return
		}
	}

	// Prepare response
	response := LoanApplicationResponse{
		ApplicationID: auditEntry.ID,
		AccountID:     req.AccountID,
		Amount:        req.Amount,
		ScoringResult: *scoringResult,
		AuditEntry:    *auditEntry,
	}

	if limitResult != nil {
		response.LimitResult = limitResult
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getAccountAge returns account age in days (stub implementation)
func (h *LimitsHandler) getAccountAge(accountID string) int {
	// In a real implementation, this would query the accounts service
	// For now, return a random-ish value based on account ID
	hash := 0
	for _, char := range accountID {
		hash += int(char)
	}
	return (hash % 365) + 30 // Between 30-395 days
}

// getPreviousPayments returns number of previous payments (stub implementation)
func (h *LimitsHandler) getPreviousPayments(accountID string) int {
	// In a real implementation, this would query payment history
	// For now, return a value based on account ID
	hash := 0
	for _, char := range accountID {
		hash += int(char)
	}
	return hash % 20 // 0-19 payments
}

// HealthCheck handles GET /health
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

// EvaluateLimitRequest represents the request for limit evaluation
type EvaluateLimitRequest struct {
	AccountID string  `json:"accountId"`
	LimitType string  `json:"limitType"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
}

// LoanApplicationRequest represents a loan application request
type LoanApplicationRequest struct {
	AccountID string  `json:"accountId"`
	UserID    string  `json:"userId,omitempty"`
	Amount    float64 `json:"amount"`
	LoanType  string  `json:"loanType,omitempty"`
	Currency  string  `json:"currency,omitempty"`
}

// LoanApplicationResponse represents the response for a loan application
type LoanApplicationResponse struct {
	ApplicationID string                   `json:"applicationId"`
	AccountID     string                   `json:"accountId"`
	Amount        float64                  `json:"amount"`
	ScoringResult domain.ScoringResult     `json:"scoringResult"`
	AuditEntry    domain.AuditEntry        `json:"auditEntry"`
	LimitResult   *domain.LimitCheckResult `json:"limitResult,omitempty"`
}

func (h *LimitsHandler) getDefaultLimit(limitType domain.LimitType) float64 {
	switch limitType {
	case domain.DailyLimit:
		return h.config.DefaultDailyLimit
	case domain.MonthlyLimit:
		return h.config.DefaultMonthlyLimit
	default:
		return 1000.0 // Fallback
	}
}
