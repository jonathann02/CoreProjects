package com.fintech.payments.application.handlers;

import com.fintech.payments.application.commands.InitiatePaymentCommand;
import com.fintech.payments.application.dto.PaymentDto;
import com.fintech.payments.application.queries.GetPaymentQuery;
import com.fintech.payments.domain.Payment;
import com.fintech.payments.domain.PaymentRepository;
import com.fintech.payments.infrastructure.client.AccountsServiceClient;
import com.fintech.payments.infrastructure.config.IdempotencyService;
import com.fintech.payments.infrastructure.config.RateLimitService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler for payment operations with idempotency and rate limiting.
 */
@Service
public class PaymentHandler {

    private static final Logger logger = LoggerFactory.getLogger(PaymentHandler.class);

    private final PaymentRepository paymentRepository;
    private final IdempotencyService idempotencyService;
    private final RateLimitService rateLimitService;
    private final AccountsServiceClient accountsClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PaymentHandler(PaymentRepository paymentRepository,
                         IdempotencyService idempotencyService,
                         RateLimitService rateLimitService,
                         AccountsServiceClient accountsClient,
                         KafkaTemplate<String, Object> kafkaTemplate) {
        this.paymentRepository = paymentRepository;
        this.idempotencyService = idempotencyService;
        this.rateLimitService = rateLimitService;
        this.accountsClient = accountsClient;
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Initiates a payment with idempotency support.
     */
    @Transactional
    public PaymentDto initiatePayment(InitiatePaymentCommand command, String userIdentifier) {
        logger.info("Initiating payment for idempotency key: {}", command.idempotencyKey());

        // Check rate limiting
        if (!rateLimitService.isAllowed(userIdentifier)) {
            throw new RateLimitExceededException("Rate limit exceeded for user: " + userIdentifier);
        }

        // Check idempotency
        if (!idempotencyService.isNewRequest(command.idempotencyKey())) {
            // Return existing payment if idempotency key already exists
            var existingPayment = paymentRepository.findByIdempotencyKey(command.idempotencyKey())
                .orElseThrow(() -> new IllegalStateException("Payment should exist for idempotency key"));

            logger.info("Returning existing payment for idempotency key: {}", command.idempotencyKey());
            return PaymentDto.from(existingPayment);
        }

        // Validate accounts asynchronously
        try {
            accountsClient.validateAccountForDebit(command.fromAccountId(), command.amount())
                .block(); // Block for synchronous validation
        } catch (Exception e) {
            logger.error("Account validation failed for payment initiation", e);
            idempotencyService.markFailed(command.idempotencyKey());
            throw new PaymentValidationException("Account validation failed: " + e.getMessage());
        }

        // Create payment
        var payment = Payment.create(
            command.idempotencyKey(),
            command.fromAccountId(),
            command.toAccountId(),
            command.amount(),
            command.currency(),
            command.description()
        );

        // Save payment as PENDING
        var savedPayment = paymentRepository.save(payment);

        // Mark idempotency as completed
        idempotencyService.markCompleted(command.idempotencyKey());

        // Publish payment initiated event
        var event = new PaymentInitiatedEvent(savedPayment.getId(), savedPayment.getIdempotencyKey());
        kafkaTemplate.send("payments", savedPayment.getId().toString(), event);

        // Process payment asynchronously
        processPaymentAsync(savedPayment);

        logger.info("Payment initiated successfully with ID: {}", savedPayment.getId());
        return PaymentDto.from(savedPayment);
    }

    /**
     * Retrieves a payment by ID.
     */
    public PaymentDto getPayment(GetPaymentQuery query) {
        logger.debug("Retrieving payment with ID: {}", query.paymentId());

        var payment = paymentRepository.findById(query.paymentId())
            .orElseThrow(() -> new PaymentNotFoundException(query.paymentId()));

        logger.debug("Payment found: {}", payment.getId());
        return PaymentDto.from(payment);
    }

    /**
     * Processes a payment asynchronously.
     */
    @Async
    public void processPaymentAsync(Payment payment) {
        logger.info("Processing payment asynchronously: {}", payment.getId());

        try {
            // Update status to PROCESSING
            var processingPayment = payment.markAsProcessing();
            paymentRepository.save(processingPayment);

            // Perform the actual transfer
            performTransfer(processingPayment);

            // Mark as completed
            var completedPayment = processingPayment.markAsCompleted();
            paymentRepository.save(completedPayment);

            // Publish completion event
            var event = new PaymentCompletedEvent(payment.getId(), payment.getAmount());
            kafkaTemplate.send("payments", payment.getId().toString(), event);

            logger.info("Payment processed successfully: {}", payment.getId());

        } catch (Exception e) {
            logger.error("Payment processing failed for payment: {}", payment.getId(), e);

            // Mark as failed
            var failedPayment = payment.markAsFailed(e.getMessage());
            paymentRepository.save(failedPayment);

            // Publish failure event
            var event = new PaymentFailedEvent(payment.getId(), e.getMessage());
            kafkaTemplate.send("payments", payment.getId().toString(), event);
        }
    }

    /**
     * Performs the actual account transfers.
     */
    private void performTransfer(Payment payment) {
        logger.debug("Performing transfer for payment: {}", payment.getId());

        // Debit from account
        accountsClient.debitAccount(
            payment.getFromAccountId(),
            payment.getAmount(),
            "Payment: " + payment.getId()
        ).block();

        // Credit to account
        accountsClient.creditAccount(
            payment.getToAccountId(),
            payment.getAmount(),
            "Payment: " + payment.getId()
        ).block();
    }

    // Event classes
    public record PaymentInitiatedEvent(UUID paymentId, UUID idempotencyKey) {}
    public record PaymentCompletedEvent(UUID paymentId, java.math.BigDecimal amount) {}
    public record PaymentFailedEvent(UUID paymentId, String reason) {}

    // Exception classes
    public static class PaymentNotFoundException extends RuntimeException {
        public PaymentNotFoundException(java.util.UUID paymentId) {
            super("Payment not found with ID: " + paymentId);
        }
    }

    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException(String message) {
            super(message);
        }
    }

    public static class PaymentValidationException extends RuntimeException {
        public PaymentValidationException(String message) {
            super(message);
        }
    }
}
