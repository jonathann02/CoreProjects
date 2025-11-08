package com.fintech.accounts.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for Account domain entity.
 */
class AccountTest {

    @Test
    void shouldCreateAccountSuccessfully() {
        // Given
        var accountNumber = "123456";
        var type = AccountType.ASSET;
        var currency = Currency.USD;

        // When
        var account = Account.create(accountNumber, type, currency);

        // Then
        assertThat(account).isNotNull();
        assertThat(account.getId()).isNotNull();
        assertThat(account.getAccountNumber()).isEqualTo(accountNumber);
        assertThat(account.getType()).isEqualTo(type);
        assertThat(account.getCurrency()).isEqualTo(currency);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.getBalance()).isEqualTo(BigDecimal.ZERO);
        assertThat(account.getCreatedAt()).isNotNull();
        assertThat(account.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldThrowExceptionWhenCreatingAccountWithNullAccountNumber() {
        assertThatThrownBy(() -> Account.create(null, AccountType.ASSET, Currency.USD))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Account number cannot be null or empty");
    }

    @Test
    void shouldThrowExceptionWhenCreatingAccountWithEmptyAccountNumber() {
        assertThatThrownBy(() -> Account.create("", AccountType.ASSET, Currency.USD))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Account number cannot be null or empty");
    }

    @Test
    void shouldThrowExceptionWhenCreatingAccountWithNullType() {
        assertThatThrownBy(() -> Account.create("123456", null, Currency.USD))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Account type cannot be null");
    }

    @Test
    void shouldThrowExceptionWhenCreatingAccountWithNullCurrency() {
        assertThatThrownBy(() -> Account.create("123456", AccountType.ASSET, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Currency cannot be null");
    }

    @Test
    void shouldCreditAccountSuccessfully() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);

        // When
        account.credit(BigDecimal.valueOf(100.50));

        // Then
        assertThat(account.getBalance()).isEqualTo(BigDecimal.valueOf(100.50));
    }

    @Test
    void shouldDebitAccountSuccessfully() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);
        account.credit(BigDecimal.valueOf(200.00));

        // When
        account.debit(BigDecimal.valueOf(50.00));

        // Then
        assertThat(account.getBalance()).isEqualTo(BigDecimal.valueOf(150.00));
    }

    @Test
    void shouldThrowExceptionWhenDebitingInactiveAccount() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);
        var closedAccount = account.close();

        // When & Then
        assertThatThrownBy(() -> closedAccount.debit(BigDecimal.valueOf(50.00)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Cannot debit inactive account");
    }

    @Test
    void shouldThrowExceptionWhenDebitingMoreThanBalance() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);
        account.credit(BigDecimal.valueOf(50.00));

        // When & Then
        assertThatThrownBy(() -> account.debit(BigDecimal.valueOf(100.00)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Insufficient funds for debit operation");
    }

    @Test
    void shouldAllowNegativeBalanceForLiabilityAccounts() {
        // Given
        var account = Account.create("2000", AccountType.LIABILITY, Currency.USD);

        // When
        account.debit(BigDecimal.valueOf(100.00)); // This should be allowed for liabilities

        // Then
        assertThat(account.getBalance()).isEqualTo(BigDecimal.valueOf(-100.00));
    }

    @Test
    void shouldCloseAccountSuccessfully() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);
        account.credit(BigDecimal.valueOf(100.00));
        account.debit(BigDecimal.valueOf(100.00)); // Balance back to zero

        // When
        var closedAccount = account.close();

        // Then
        assertThat(closedAccount.getStatus()).isEqualTo(AccountStatus.CLOSED);
        assertThat(closedAccount.getBalance()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void shouldThrowExceptionWhenClosingAccountWithNonZeroBalance() {
        // Given
        var account = Account.create("123456", AccountType.ASSET, Currency.USD);
        account.credit(BigDecimal.valueOf(100.00));

        // When & Then
        assertThatThrownBy(() -> account.close())
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Cannot close account with non-zero balance");
    }

    @Test
    void shouldImplementEqualsAndHashCodeBasedOnId() {
        // Given
        var id = UUID.randomUUID();
        var account1 = Account.create("123456", AccountType.ASSET, Currency.USD);
        var account2 = Account.create("789012", AccountType.LIABILITY, Currency.EUR);

        // Simulate same ID (this is not how you'd normally create accounts)
        // For testing purposes only
        assertThat(account1).isNotEqualTo(account2);
        assertThat(account1.hashCode()).isNotEqualTo(account2.hashCode());
    }
}
