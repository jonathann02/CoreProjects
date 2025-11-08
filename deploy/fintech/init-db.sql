-- FinTech Platform Database Initialization
-- This script creates the necessary databases and users

-- Create fintech database
CREATE DATABASE fintech;
GRANT ALL PRIVILEGES ON DATABASE fintech TO fintech_user;

-- Create keycloak database
CREATE DATABASE fintech_keycloak;
GRANT ALL PRIVILEGES ON DATABASE fintech_keycloak TO fintech_user;

-- Switch to fintech database
\c fintech;

-- Create schema for accounts service
-- (Flyway will handle the actual table creation)

-- Create any shared tables or functions here if needed
-- For now, the accounts service handles its own schema via Flyway
