package com.fintech.accounts.application.handlers;

import com.fintech.accounts.application.dto.AccountDto;
import com.fintech.accounts.application.queries.GetAccountQuery;
import com.fintech.accounts.domain.AccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Handler for GetAccountQuery.
 */
@Service
public class GetAccountHandler {

    private static final Logger logger = LoggerFactory.getLogger(GetAccountHandler.class);

    private final AccountRepository accountRepository;

    public GetAccountHandler(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public AccountDto handle(GetAccountQuery query) {
        logger.debug("Retrieving account with ID: {}", query.accountId());

        var account = accountRepository.findById(query.accountId())
            .orElseThrow(() -> new AccountNotFoundException(query.accountId()));

        logger.debug("Account found: {}", account.getAccountNumber());

        return AccountDto.from(account);
    }

    /**
     * Exception thrown when an account is not found.
     */
    public static class AccountNotFoundException extends RuntimeException {
        public AccountNotFoundException(java.util.UUID accountId) {
            super("Account not found with ID: " + accountId);
        }
    }
}
