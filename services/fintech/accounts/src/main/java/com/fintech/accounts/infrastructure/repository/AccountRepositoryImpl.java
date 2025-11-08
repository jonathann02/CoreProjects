package com.fintech.accounts.infrastructure.repository;

import com.fintech.accounts.domain.Account;
import com.fintech.accounts.domain.AccountRepository;
import com.fintech.accounts.infrastructure.entity.AccountEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

/**
 * JDBC implementation of AccountRepository.
 */
@Repository
public class AccountRepositoryImpl implements AccountRepository {

    private final JdbcTemplate jdbcTemplate;

    public AccountRepositoryImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public Account save(Account account) {
        var entity = new AccountEntity(account);

        // Upsert logic - insert or update based on existence
        var exists = existsByAccountNumber(account.getAccountNumber());

        if (exists) {
            // Update existing account
            jdbcTemplate.update(
                "UPDATE accounts SET type = ?, currency = ?, status = ?, balance = ?, updated_at = CURRENT_TIMESTAMP WHERE account_number = ?",
                account.getType().name(),
                account.getCurrency().name(),
                account.getStatus().name(),
                account.getBalance(),
                account.getAccountNumber()
            );
        } else {
            // Insert new account
            jdbcTemplate.update(
                "INSERT INTO accounts (id, account_number, type, currency, status, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                account.getId(),
                account.getAccountNumber(),
                account.getType().name(),
                account.getCurrency().name(),
                account.getStatus().name(),
                account.getBalance(),
                account.getCreatedAt(),
                account.getUpdatedAt()
            );
        }

        return account;
    }

    @Override
    public Optional<Account> findById(UUID id) {
        var sql = "SELECT id, account_number, type, currency, status, balance, created_at, updated_at FROM accounts WHERE id = ?";
        var accounts = jdbcTemplate.query(sql, new AccountRowMapper(), id);

        return accounts.stream().findFirst();
    }

    @Override
    public Optional<Account> findByAccountNumber(String accountNumber) {
        var sql = "SELECT id, account_number, type, currency, status, balance, created_at, updated_at FROM accounts WHERE account_number = ?";
        var accounts = jdbcTemplate.query(sql, new AccountRowMapper(), accountNumber);

        return accounts.stream().findFirst();
    }

    @Override
    public boolean existsByAccountNumber(String accountNumber) {
        var sql = "SELECT COUNT(*) FROM accounts WHERE account_number = ?";
        var count = jdbcTemplate.queryForObject(sql, Integer.class, accountNumber);

        return count != null && count > 0;
    }

    @Override
    @Transactional
    public void delete(Account account) {
        jdbcTemplate.update("DELETE FROM accounts WHERE id = ?", account.getId());
    }

    /**
     * RowMapper for converting database rows to Account domain entities.
     */
    private static class AccountRowMapper implements RowMapper<Account> {
        @Override
        public Account mapRow(ResultSet rs, int rowNum) throws SQLException {
            try {
                return new Account(
                    UUID.fromString(rs.getString("id")),
                    rs.getString("account_number"),
                    com.fintech.accounts.domain.AccountType.valueOf(rs.getString("type")),
                    com.fintech.accounts.domain.Currency.valueOf(rs.getString("currency")),
                    com.fintech.accounts.domain.AccountStatus.valueOf(rs.getString("status")),
                    rs.getBigDecimal("balance"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("updated_at").toInstant()
                );
            } catch (IllegalArgumentException e) {
                throw new SQLException("Invalid enum value in database", e);
            }
        }
    }
}
