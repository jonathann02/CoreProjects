package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fintech/limits-service/internal/config"
	"fintech/limits-service/internal/handlers"
	"fintech/limits-service/pkg/database"
	"fintech/limits-service/pkg/kafka"
	"fintech/limits-service/pkg/otel"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Setup logging
	setupLogging(cfg)

	logrus.Info("Starting Limits Service")

	// Initialize OpenTelemetry
	tp, err := otel.InitTracerProvider(cfg.ServiceName, cfg.OTLPEndpoint)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to initialize OpenTelemetry")
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			logrus.WithError(err).Error("Failed to shutdown tracer")
		}
	}()

	// Initialize database
	db, err := database.NewConnection(cfg.DatabaseURL)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to connect to database")
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		logrus.WithError(err).Fatal("Failed to run migrations")
	}

	// Initialize handlers
	limitsHandler := handlers.NewLimitsHandler(db)

	// Initialize Kafka consumer
	consumer, err := kafka.NewConsumer(cfg.KafkaBrokers, "limits-service", "payments")
	if err != nil {
		logrus.WithError(err).Fatal("Failed to create Kafka consumer")
	}
	defer consumer.Close()

	// Start Kafka consumer in background
	go func() {
		logrus.Info("Starting Kafka consumer")
		if err := consumer.Start(context.Background(), limitsHandler.HandlePaymentEvent); err != nil {
			logrus.WithError(err).Fatal("Kafka consumer failed")
		}
	}()

	// Setup HTTP server
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", handlers.HealthCheck).Methods("GET")

	// Limits evaluation endpoint
	router.HandleFunc("/limits/evaluate", limitsHandler.EvaluateLimit).Methods("POST")

	// Loan application endpoint
	router.HandleFunc("/loans/apply", limitsHandler.ApplyForLoan).Methods("POST")

	// Metrics endpoint
	router.Handle("/metrics", promhttp.Handler()).Methods("GET")

	// Start HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logrus.Infof("Starting HTTP server on port %d", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logrus.WithError(err).Fatal("Failed to start HTTP server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logrus.Info("Shutting down server...")

	// Give outstanding requests a deadline for completion
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logrus.WithError(err).Error("Server forced to shutdown")
	}

	logrus.Info("Server exited")
}

func setupLogging(cfg *config.Config) {
	logrus.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
	})

	if cfg.Environment == "production" {
		logrus.SetLevel(logrus.InfoLevel)
	} else {
		logrus.SetLevel(logrus.DebugLevel)
	}
}
