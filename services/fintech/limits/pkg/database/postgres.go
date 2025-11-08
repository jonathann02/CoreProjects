package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sirupsen/logrus"
)

// DB represents database connection
type DB struct {
	*pgxpool.Pool
}

// NewConnection creates a new PostgreSQL connection pool
func NewConnection(databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Configure connection pool
	config.MaxConns = 10
	config.MinConns = 2

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logrus.Info("Successfully connected to PostgreSQL")
	return &DB{pool}, nil
}

// RunMigrations runs database migrations
func RunMigrations(db *DB) error {
	logrus.Info("Running database migrations")

	// For simplicity, we'll create tables directly
	// In production, you'd use a proper migration tool like golang-migrate

	ctx := context.Background()

	// Create limits table
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS limits (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			account_id VARCHAR(255) NOT NULL,
			type VARCHAR(20) NOT NULL CHECK (type IN ('DAILY', 'MONTHLY')),
			amount DECIMAL(19,4) NOT NULL,
			used DECIMAL(19,4) NOT NULL DEFAULT 0,
			currency VARCHAR(3) NOT NULL,
			period_start TIMESTAMP WITH TIME ZONE NOT NULL,
			period_end TIMESTAMP WITH TIME ZONE NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(account_id, type, period_start)
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create limits table: %w", err)
	}

	// Create indexes
	_, err = db.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS idx_limits_account_type_period
		ON limits(account_id, type, period_start)
	`)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	_, err = db.Exec(ctx, `
		CREATE INDEX IF NOT EXISTS idx_limits_period_end
		ON limits(period_end)
	`)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	logrus.Info("Database migrations completed successfully")
	return nil
}

// Close closes the database connection
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
		logrus.Info("Database connection closed")
	}
}
