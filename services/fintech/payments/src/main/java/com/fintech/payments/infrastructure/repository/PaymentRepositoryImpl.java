package com.fintech.payments.infrastructure.repository;

import com.fintech.payments.domain.Currency;
import com.fintech.payments.domain.Payment;
import com.fintech.payments.domain.PaymentRepository;
import com.fintech.payments.domain.PaymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

/**
 * JDBC implementation of PaymentRepository.
 */
@Repository
public class PaymentRepositoryImpl implements PaymentRepository {

    private static final Logger logger = LoggerFactory.getLogger(PaymentRepositoryImpl.class);

    private final JdbcTemplate jdbcTemplate;

    public PaymentRepositoryImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public Payment save(Payment payment) {
        logger.debug("Saving payment with ID: {}", payment.getId());

        // Check if payment already exists
        var exists = existsByIdempotencyKey(payment.getIdempotencyKey());

        if (exists) {
            // Update existing payment
            jdbcTemplate.update(
                "UPDATE payments SET from_account_id = ?, to_account_id = ?, amount = ?, currency = ?, description = ?, status = ?, failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE idempotency_key = ?",
                payment.getFromAccountId(),
                payment.getToAccountId(),
                payment.getAmount(),
                payment.getCurrency().name(),
                payment.getDescription(),
                payment.getStatus().name(),
                payment.getFailureReason(),
                payment.getIdempotencyKey()
            );

            // Retrieve updated payment
            return findByIdempotencyKey(payment.getIdempotencyKey())
                .orElseThrow(() -> new IllegalStateException("Payment should exist after update"));
        } else {
            // Insert new payment
            jdbcTemplate.update(
                "INSERT INTO payments (id, idempotency_key, from_account_id, to_account_id, amount, currency, description, status, failure_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                payment.getId(),
                payment.getIdempotencyKey(),
                payment.getFromAccountId(),
                payment.getToAccountId(),
                payment.getAmount(),
                payment.getCurrency().name(),
                payment.getDescription(),
                payment.getStatus().name(),
                payment.getFailureReason(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
            );
        }

        return payment;
    }

    @Override
    public Optional<Payment> findById(UUID id) {
        logger.debug("Finding payment by ID: {}", id);
        var sql = "SELECT id, idempotency_key, from_account_id, to_account_id, amount, currency, description, status, failure_reason, created_at, updated_at FROM payments WHERE id = ?";
        var payments = jdbcTemplate.query(sql, new PaymentRowMapper(), id);

        return payments.stream().findFirst();
    }

    @Override
    public Optional<Payment> findByIdempotencyKey(UUID idempotencyKey) {
        logger.debug("Finding payment by idempotency key: {}", idempotencyKey);
        var sql = "SELECT id, idempotency_key, from_account_id, to_account_id, amount, currency, description, status, failure_reason, created_at, updated_at FROM payments WHERE idempotency_key = ?";
        var payments = jdbcTemplate.query(sql, new PaymentRowMapper(), idempotencyKey);

        return payments.stream().findFirst();
    }

    @Override
    public boolean existsByIdempotencyKey(UUID idempotencyKey) {
        logger.debug("Checking if payment exists with idempotency key: {}", idempotencyKey);
        var sql = "SELECT COUNT(*) FROM payments WHERE idempotency_key = ?";
        var count = jdbcTemplate.queryForObject(sql, Integer.class, idempotencyKey);

        return count != null && count > 0;
    }

    @Override
    @Transactional
    public Payment updateStatus(UUID paymentId, PaymentStatus newStatus, String failureReason) {
        logger.debug("Updating payment {} status to {}", paymentId, newStatus);

        jdbcTemplate.update(
            "UPDATE payments SET status = ?, failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            newStatus.name(),
            failureReason,
            paymentId
        );

        return findById(paymentId)
            .orElseThrow(() -> new IllegalStateException("Payment not found after status update: " + paymentId));
    }

    /**
     * RowMapper for converting database rows to Payment domain entities.
     */
    private static class PaymentRowMapper implements RowMapper<Payment> {
        @Override
        public Payment mapRow(ResultSet rs, int rowNum) throws SQLException {
            try {
                return new Payment(
                    UUID.fromString(rs.getString("id")),
                    UUID.fromString(rs.getString("idempotency_key")),
                    UUID.fromString(rs.getString("from_account_id")),
                    UUID.fromString(rs.getString("to_account_id")),
                    rs.getBigDecimal("amount"),
                    Currency.valueOf(rs.getString("currency")),
                    rs.getString("description"),
                    PaymentStatus.valueOf(rs.getString("status")),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("updated_at").toInstant(),
                    rs.getString("failure_reason")
                );
            } catch (IllegalArgumentException e) {
                throw new SQLException("Invalid enum value in database", e);
            }
        }
    }
}
