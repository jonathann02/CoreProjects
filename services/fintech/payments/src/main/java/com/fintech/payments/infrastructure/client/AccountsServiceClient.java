package com.fintech.payments.infrastructure.client;

import com.fintech.accounts.application.dto.AccountDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Client for communicating with the Accounts Service.
 */
@Service
public class AccountsServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(AccountsServiceClient.class);

    private final WebClient webClient;

    public AccountsServiceClient(@Value("${app.accounts-service.url:http://localhost:8082}") String accountsServiceUrl) {
        this.webClient = WebClient.builder()
            .baseUrl(accountsServiceUrl)
            .build();
    }

    /**
     * Retrieves account information by ID.
     */
    public Mono<AccountDto> getAccount(UUID accountId) {
        logger.debug("Retrieving account: {}", accountId);

        return webClient.get()
            .uri("/v1/accounts/{id}", accountId)
            .retrieve()
            .onStatus(HttpStatus.NOT_FOUND::equals,
                response -> Mono.error(new AccountNotFoundException(accountId)))
            .bodyToMono(AccountDto.class)
            .doOnNext(account -> logger.debug("Retrieved account: {}", account.id()))
            .doOnError(error -> logger.error("Error retrieving account {}: {}", accountId, error.getMessage()));
    }

    /**
     * Validates that an account exists and has sufficient balance.
     */
    public Mono<Void> validateAccountForDebit(UUID accountId, BigDecimal amount) {
        logger.debug("Validating account {} for debit of {}", accountId, amount);

        return getAccount(accountId)
            .flatMap(account -> {
                if (account.status() != com.fintech.accounts.application.dto.AccountDto.AccountStatus.ACTIVE) {
                    return Mono.error(new AccountValidationException(
                        "Account " + accountId + " is not active"));
                }

                if (account.balance().compareTo(amount) < 0) {
                    return Mono.error(new InsufficientFundsException(
                        "Account " + accountId + " has insufficient funds. Required: " + amount +
                        ", Available: " + account.balance()));
                }

                return Mono.empty();
            });
    }

    /**
     * Simulates debiting an account (in a real implementation, this would call the accounts service).
     * For now, this is a placeholder - in production, you'd call the accounts service API.
     */
    public Mono<Void> debitAccount(UUID accountId, BigDecimal amount, String description) {
        logger.info("Debiting account {} for amount {}: {}", accountId, amount, description);

        // In a real implementation, this would make an HTTP call to the accounts service
        // For now, we'll simulate the operation
        return Mono.empty();
    }

    /**
     * Simulates crediting an account (in a real implementation, this would call the accounts service).
     */
    public Mono<Void> creditAccount(UUID accountId, BigDecimal amount, String description) {
        logger.info("Crediting account {} for amount {}: {}", accountId, amount, description);

        // In a real implementation, this would make an HTTP call to the accounts service
        return Mono.empty();
    }

    // Exception classes
    public static class AccountNotFoundException extends RuntimeException {
        public AccountNotFoundException(UUID accountId) {
            super("Account not found: " + accountId);
        }
    }

    public static class AccountValidationException extends RuntimeException {
        public AccountValidationException(String message) {
            super(message);
        }
    }

    public static class InsufficientFundsException extends RuntimeException {
        public InsufficientFundsException(String message) {
            super(message);
        }
    }
}
