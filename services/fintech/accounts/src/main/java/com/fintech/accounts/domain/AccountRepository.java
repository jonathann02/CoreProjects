package com.fintech.accounts.domain;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Account domain operations.
 */
public interface AccountRepository {

    /**
     * Saves an account to the repository.
     */
    Account save(Account account);

    /**
     * Finds an account by its ID.
     */
    Optional<Account> findById(UUID id);

    /**
     * Finds an account by its account number.
     */
    Optional<Account> findByAccountNumber(String accountNumber);

    /**
     * Checks if an account exists with the given account number.
     */
    boolean existsByAccountNumber(String accountNumber);

    /**
     * Deletes an account from the repository.
     */
    void delete(Account account);
}
