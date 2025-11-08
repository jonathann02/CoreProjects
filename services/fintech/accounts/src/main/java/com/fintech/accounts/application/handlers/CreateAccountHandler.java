package com.fintech.accounts.application.handlers;

import com.fintech.accounts.application.commands.CreateAccountCommand;
import com.fintech.accounts.application.dto.AccountDto;
import com.fintech.accounts.domain.Account;
import com.fintech.accounts.domain.AccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler for CreateAccountCommand.
 */
@Service
public class CreateAccountHandler {

    private static final Logger logger = LoggerFactory.getLogger(CreateAccountHandler.class);

    private final AccountRepository accountRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CreateAccountHandler(AccountRepository accountRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.accountRepository = accountRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Transactional
    public AccountDto handle(CreateAccountCommand command) {
        logger.info("Creating account with number: {}", command.accountNumber());

        // Check if account already exists
        if (accountRepository.existsByAccountNumber(command.accountNumber())) {
            throw new IllegalArgumentException("Account with number " + command.accountNumber() + " already exists");
        }

        // Create account domain entity
        var account = Account.create(command.accountNumber(), command.type(), command.currency());

        // Save to repository
        var savedAccount = accountRepository.save(account);

        // Publish event to Kafka
        var event = new AccountCreatedEvent(savedAccount.getId(), savedAccount.getAccountNumber());
        kafkaTemplate.send("accounts", savedAccount.getId().toString(), event);

        logger.info("Account created successfully with ID: {}", savedAccount.getId());

        return AccountDto.from(savedAccount);
    }

    /**
     * Event published when an account is created.
     */
    public record AccountCreatedEvent(
        java.util.UUID accountId,
        String accountNumber
    ) {}
}
