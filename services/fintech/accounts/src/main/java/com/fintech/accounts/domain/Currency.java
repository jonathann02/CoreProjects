package com.fintech.accounts.domain;

import java.util.Currency;

/**
 * Supported currencies in the FinTech platform.
 * Based on ISO 4217 currency codes.
 */
public enum Currency {
    USD("USD", "US Dollar", 2),
    EUR("EUR", "Euro", 2),
    SEK("SEK", "Swedish Krona", 2),
    GBP("GBP", "British Pound", 2),
    JPY("JPY", "Japanese Yen", 0),
    CAD("CAD", "Canadian Dollar", 2),
    AUD("AUD", "Australian Dollar", 2),
    CHF("CHF", "Swiss Franc", 2),
    NOK("NOK", "Norwegian Krone", 2),
    DKK("DKK", "Danish Krone", 2);

    private final String code;
    private final String displayName;
    private final int decimalPlaces;

    Currency(String code, String displayName, int decimalPlaces) {
        this.code = code;
        this.displayName = displayName;
        this.decimalPlaces = decimalPlaces;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getDecimalPlaces() {
        return decimalPlaces;
    }

    /**
     * Converts to java.util.Currency for additional operations.
     */
    public java.util.Currency toJavaCurrency() {
        return java.util.Currency.getInstance(code);
    }

    @Override
    public String toString() {
        return code;
    }

    /**
     * Finds currency by ISO code.
     */
    public static Currency fromCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("Currency code cannot be null");
        }

        for (Currency currency : values()) {
            if (currency.code.equals(code.toUpperCase())) {
                return currency;
            }
        }

        throw new IllegalArgumentException("Unsupported currency code: " + code);
    }
}
