package com.fintech.accounts.web.controllers;

import com.fintech.accounts.application.commands.CreateAccountCommand;
import com.fintech.accounts.application.dto.AccountDto;
import com.fintech.accounts.application.handlers.CreateAccountHandler;
import com.fintech.accounts.application.handlers.GetAccountHandler;
import com.fintech.accounts.application.queries.GetAccountQuery;
import com.fintech.accounts.domain.AccountType;
import com.fintech.accounts.domain.Currency;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for account operations.
 */
@RestController
@RequestMapping("/v1/accounts")
@Tag(name = "Accounts", description = "Account management endpoints")
public class AccountController {

    private static final Logger logger = LoggerFactory.getLogger(AccountController.class);

    private final CreateAccountHandler createAccountHandler;
    private final GetAccountHandler getAccountHandler;

    public AccountController(CreateAccountHandler createAccountHandler, GetAccountHandler getAccountHandler) {
        this.createAccountHandler = createAccountHandler;
        this.getAccountHandler = getAccountHandler;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_accounts:write')")
    @Operation(summary = "Create a new account", description = "Creates a new account with the specified details")
    public ResponseEntity<AccountDto> createAccount(
            @Valid @RequestBody CreateAccountRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        logger.info("Creating account for user: {}", jwt.getSubject());

        var command = new CreateAccountCommand(
            request.accountNumber(),
            request.type(),
            request.currency()
        );

        var account = createAccountHandler.handle(command);

        logger.info("Account created successfully: {}", account.id());

        return ResponseEntity.status(HttpStatus.CREATED).body(account);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_accounts:read')")
    @Operation(summary = "Get account by ID", description = "Retrieves account information by account ID")
    public ResponseEntity<AccountDto> getAccount(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        logger.debug("Retrieving account {} for user: {}", id, jwt.getSubject());

        var query = new GetAccountQuery(id);
        var account = getAccountHandler.handle(query);

        return ResponseEntity.ok(account);
    }

    /**
     * Request DTO for creating accounts.
     */
    public record CreateAccountRequest(
        String accountNumber,
        AccountType type,
        Currency currency
    ) {
        public CreateAccountRequest {
            if (accountNumber == null || accountNumber.trim().isEmpty()) {
                throw new IllegalArgumentException("Account number cannot be null or empty");
            }
            if (type == null) {
                throw new IllegalArgumentException("Account type cannot be null");
            }
            if (currency == null) {
                throw new IllegalArgumentException("Currency cannot be null");
            }
        }
    }
}
