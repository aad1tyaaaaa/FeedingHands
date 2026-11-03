// Command server runs the FeedingHands API.
package main

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"feedinghands/backend-go/internal/auth"
	"feedinghands/backend-go/internal/biogas"
	"feedinghands/backend-go/internal/db"
	"feedinghands/backend-go/internal/donation"
	"feedinghands/backend-go/internal/httpx"
	"feedinghands/backend-go/internal/organization"
	"feedinghands/backend-go/internal/volunteer"

	"github.com/joho/godotenv"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	_ = godotenv.Load() // .env is optional; real environment variables win

	dbURL := os.Getenv("DATABASE_URL")
	secret := os.Getenv("JWT_SECRET")
	port := cmp.Or(os.Getenv("PORT"), "5001")
	production := os.Getenv("APP_ENV") == "production"
	switch {
	case dbURL == "":
		return errors.New("DATABASE_URL is not set")
	case len(secret) < 32:
		return errors.New("JWT_SECRET must be at least 32 characters")
	}

	if err := db.Migrate(dbURL); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, dbURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	tokens := auth.NewTokens(secret)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			httpx.JSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "db": "down"})
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "db": "up", "service": "feeding-hands-backend-go"})
	})
	(&auth.Handler{DB: pool, Tokens: tokens, ExposeOTP: !production}).Register(mux)
	(&organization.Handler{DB: pool, Tokens: tokens}).Register(mux)
	(&donation.Handler{DB: pool, Tokens: tokens}).Register(mux)
	(&volunteer.Handler{DB: pool, Tokens: tokens}).Register(mux)
	(&biogas.Handler{DB: pool, Tokens: tokens}).Register(mux)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           httpx.Logger(httpx.CORS(httpx.Origins(os.Getenv("CORS_ORIGIN")), mux)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("FeedingHands API listening on http://localhost:%s", port)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
