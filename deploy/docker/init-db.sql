-- Wait for SQL Server to start
WAITFOR DELAY '00:00:10';

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'CatalogDb')
BEGIN
    CREATE DATABASE CatalogDb;
END

-- Switch to the database
USE CatalogDb;

-- Create login and user with minimal permissions for the application
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'catalog_user')
BEGIN
    CREATE LOGIN catalog_user WITH PASSWORD = 'CatalogUser!2024';
END

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'catalog_user')
BEGIN
    CREATE USER catalog_user FOR LOGIN catalog_user;
END

-- Grant minimal permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO catalog_user;
GRANT EXECUTE ON SCHEMA::dbo TO catalog_user;

-- Note: In production, use proper database user with minimal permissions
-- The sa account should never be used in application code
