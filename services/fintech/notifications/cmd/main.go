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

	"fintech/notifications-service/internal/config"
	"fintech/notifications-service/internal/handlers"
	"fintech/notifications-service/pkg/aws"
	"fintech/notifications-service/pkg/database"
	"fintech/notifications-service/pkg/kafka"
	"fintech/notifications-service/pkg/otel"

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

	logrus.Info("Starting Notifications Service")

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

	// Initialize AWS clients
	snsClient, err := aws.NewSNSClient(cfg.AWSConfig)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to create SNS client")
	}

	sqsClient, err := aws.NewSQSClient(cfg.AWSConfig)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to create SQS client")
	}

	// Initialize notification service
	notificationSvc := handlers.NewNotificationService(db, snsClient, sqsClient, cfg)

	// Initialize Kafka consumers for different event types
	paymentConsumer, err := kafka.NewConsumer(cfg.KafkaBrokers, "notifications-service-payments", "payments")
	if err != nil {
		logrus.WithError(err).Fatal("Failed to create payment consumer")
	}
	defer paymentConsumer.Close()

	// Start Kafka consumers in background
	go func() {
		logrus.Info("Starting payment event consumer")
		if err := paymentConsumer.Start(context.Background(), notificationSvc.HandlePaymentEvent); err != nil {
			logrus.WithError(err).Fatal("Payment consumer failed")
		}
	}()

	// Setup HTTP server
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", handlers.HealthCheck).Methods("GET")

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
