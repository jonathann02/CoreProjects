package com.fintech.accounts.domain;

/**
 * Account types in double-entry bookkeeping.
 */
public enum AccountType {
    ASSET,      // Resources owned by the business (debit increases)
    LIABILITY,  // Debts owed by the business (credit increases)
    EQUITY,     // Owner's claims on assets (credit increases)
    REVENUE,    // Income earned (credit increases)
    EXPENSE     // Costs incurred (debit increases)
}
