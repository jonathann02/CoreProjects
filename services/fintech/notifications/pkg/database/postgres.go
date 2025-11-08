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

	// Create notifications table
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS notifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id VARCHAR(255) NOT NULL,
			event_type VARCHAR(100) NOT NULL,
			type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'SMS', 'PUSH')),
			recipient VARCHAR(255) NOT NULL,
			subject VARCHAR(500),
			body TEXT NOT NULL,
			status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED')),
			priority INTEGER NOT NULL DEFAULT 1,
			retry_count INTEGER NOT NULL DEFAULT 0,
			max_retries INTEGER NOT NULL DEFAULT 3,
			next_retry_at TIMESTAMP WITH TIME ZONE,
			error TEXT,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			sent_at TIMESTAMP WITH TIME ZONE
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create notifications table: %w", err)
	}

	// Create indexes
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_next_retry_at ON notifications(next_retry_at)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_status_priority_created ON notifications(status, priority DESC, created_at ASC)",
		"CREATE INDEX IF NOT EXISTS idx_notifications_event_type_status ON notifications(event_type, status)",
	}

	for _, indexSQL := range indexes {
		if _, err := db.Exec(ctx, indexSQL); err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
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
