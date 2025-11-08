-- Create accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    balance DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_created_at ON accounts(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial chart of accounts
INSERT INTO accounts (id, account_number, type, currency, status, balance) VALUES
    (gen_random_uuid(), '1000', 'ASSET', 'USD', 'ACTIVE', 0.0000),
    (gen_random_uuid(), '1100', 'ASSET', 'USD', 'ACTIVE', 0.0000),
    (gen_random_uuid(), '2000', 'LIABILITY', 'USD', 'ACTIVE', 0.0000),
    (gen_random_uuid(), '3000', 'EQUITY', 'USD', 'ACTIVE', 0.0000),
    (gen_random_uuid(), '4000', 'REVENUE', 'USD', 'ACTIVE', 0.0000),
    (gen_random_uuid(), '5000', 'EXPENSE', 'USD', 'ACTIVE', 0.0000);
