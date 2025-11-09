package com.fintech.payments.web.controllers;

import com.fintech.payments.application.commands.InitiatePaymentCommand;
import com.fintech.payments.application.dto.PaymentDto;
import com.fintech.payments.application.handlers.PaymentHandler;
import com.fintech.payments.application.queries.GetPaymentQuery;
import com.fintech.payments.domain.Currency;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.UUID;

/**
 * REST controller for payment operations.
 */
@RestController
@RequestMapping("/v1/payments")
@Tag(name = "Payments", description = "Payment processing endpoints")
@Validated
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentHandler paymentHandler;

    public PaymentController(PaymentHandler paymentHandler) {
        this.paymentHandler = paymentHandler;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_payments:write')")
    @Operation(summary = "Initiate a payment", description = "Creates and initiates a new payment with idempotency support")
    public ResponseEntity<PaymentDto> initiatePayment(
            @Valid @RequestBody InitiatePaymentRequest request,
            @Parameter(description = "Idempotency-Key header for duplicate request handling")
            @RequestHeader(value = "Idempotency-Key", required = true) String idempotencyKeyHeader,
            @AuthenticationPrincipal Jwt jwt) {

        logger.info("Initiating payment for user: {}", jwt.getSubject());

        var idempotencyKey = UUID.fromString(idempotencyKeyHeader);
        var command = new InitiatePaymentCommand(
            idempotencyKey,
            request.fromAccountId(),
            request.toAccountId(),
            request.amount(),
            request.currency(),
            request.description()
        );

        var payment = paymentHandler.initiatePayment(command, jwt.getSubject());

        var headers = new HttpHeaders();
        headers.setLocation(URI.create("/v1/payments/" + payment.id()));

        logger.info("Payment initiated successfully with ID: {}", payment.id());

        return ResponseEntity.status(HttpStatus.CREATED)
            .headers(headers)
            .body(payment);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_payments:read')")
    @Operation(summary = "Get payment by ID", description = "Retrieves payment information by payment ID")
    public ResponseEntity<PaymentDto> getPayment(
            @PathVariable @NotNull UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        logger.debug("Retrieving payment {} for user: {}", id, jwt.getSubject());

        var query = new GetPaymentQuery(id);
        var payment = paymentHandler.getPayment(query);

        return ResponseEntity.ok(payment);
    }

    /**
     * Request DTO for initiating payments.
     */
    public record InitiatePaymentRequest(
        @NotNull(message = "From account ID is required") UUID fromAccountId,
        @NotNull(message = "To account ID is required") UUID toAccountId,
        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive") BigDecimal amount,
        @NotNull(message = "Currency is required") Currency currency,
        String description
    ) {
        public InitiatePaymentRequest {
            if (fromAccountId != null && toAccountId != null && fromAccountId.equals(toAccountId)) {
                throw new IllegalArgumentException("From and to account IDs cannot be the same");
            }
            if (description != null && description.length() > 500) {
                throw new IllegalArgumentException("Description cannot exceed 500 characters");
            }
        }
    }
}
