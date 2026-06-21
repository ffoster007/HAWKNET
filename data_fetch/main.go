package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hawknet/data_fetch/internal/config"
	"github.com/hawknet/data_fetch/internal/graph"
	"github.com/hawknet/data_fetch/internal/scanner"
	"github.com/hawknet/data_fetch/internal/types"
)

func main() {
	cfg, err := config.Load("./src-tauri/.env", "./hawknet_runtime.json")
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	log.Printf("[hawknet-fetch] ai=%v passive=%v", cfg.AIAvailable(), cfg.Runtime.PassiveOnly)

	pipe := scanner.NewPipeline(cfg)

	mux := http.NewServeMux()

	// POST /scan → run full pipeline, return ScanResult + VulnGraph
	mux.HandleFunc("POST /scan", func(w http.ResponseWriter, r *http.Request) {
		var target types.ScanTarget
		if err := json.NewDecoder(r.Body).Decode(&target); err != nil {
			http.Error(w, "bad json: "+err.Error(), http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
		defer cancel()

		result := pipe.Run(ctx, target)
		g := graph.Build(&result)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"result": result,
			"graph":  g,
		})
	})

	// GET /health
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":       "ok",
			"ai_available": cfg.AIAvailable(),
			"passive_only": cfg.Runtime.PassiveOnly,
		})
	})

	// POST /config/runtime — Tauri UI writes AI toggle here
	mux.HandleFunc("POST /config/runtime", func(w http.ResponseWriter, r *http.Request) {
		var flags config.RuntimeFlags
		if err := json.NewDecoder(r.Body).Decode(&flags); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		data, _ := json.MarshalIndent(flags, "", "  ")
		if err := os.WriteFile("./hawknet_runtime.json", data, 0644); err != nil {
			http.Error(w, "write failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		cfg.Runtime = flags
		log.Printf("[config] ai=%v passive=%v", flags.AIEnabled, flags.PassiveOnly)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
	})

	addr := ":5000"
	if v := os.Getenv("HAWKNET_FETCH_ADDR"); v != "" {
		addr = v
	}
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[hawknet-fetch] listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-quit
	log.Println("[hawknet-fetch] shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
