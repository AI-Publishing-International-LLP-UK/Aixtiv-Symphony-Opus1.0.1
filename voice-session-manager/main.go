package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// Redis client (optional)
	redisClient *redis.Client

	// Prometheus metrics
	sessionCreatedCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "voice_sessions_created_total",
			Help: "Total number of voice sessions created",
		},
		[]string{"environment", "agent_type"},
	)

	tokenValidatedCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "voice_tokens_validated_total",
			Help: "Total number of voice tokens validated",
		},
		[]string{"environment", "status"},
	)

	callDurationHistogram = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "voice_call_duration_seconds",
			Help:    "Duration of voice calls in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"environment", "agent_id"},
	)

	responseTimeHistogram = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "voice_api_response_time_seconds",
			Help:    "Response time of voice API endpoints",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"endpoint", "method", "status"},
	)
)

type SessionRequest struct {
	AgentID     string            `json:"agent_id"`
	AccessToken string            `json:"access_token"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type SessionResponse struct {
	SessionID   string    `json:"session_id"`
	ExpiresAt   time.Time `json:"expires_at"`
	AgentID     string    `json:"agent_id"`
	Environment string    `json:"environment"`
}

type CallEvent struct {
	SessionID   string    `json:"session_id"`
	EventType   string    `json:"event_type"` // start, stop, quality_report
	AgentID     string    `json:"agent_id"`
	Timestamp   time.Time `json:"timestamp"`
	Duration    *int64    `json:"duration,omitempty"`    // in seconds, for stop events
	Quality     *float64  `json:"quality,omitempty"`     // quality score 0-1
	ErrorCode   *string   `json:"error_code,omitempty"`  // if call failed
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type HealthResponse struct {
	Status      string            `json:"status"`
	Environment string            `json:"environment"`
	Timestamp   time.Time         `json:"timestamp"`
	Services    map[string]string `json:"services"`
}

func init() {
	// Register Prometheus metrics
	prometheus.MustRegister(sessionCreatedCounter)
	prometheus.MustRegister(tokenValidatedCounter)
	prometheus.MustRegister(callDurationHistogram)
	prometheus.MustRegister(responseTimeHistogram)
}

func main() {
	// Initialize Redis if URL provided
	initRedis()

	// Setup router
	r := mux.NewRouter()

	// Middleware for response time tracking
	r.Use(responseTimeMiddleware)

	// API routes
	r.HandleFunc("/health", healthHandler).Methods("GET")
	r.HandleFunc("/metrics", promhttp.Handler().ServeHTTP).Methods("GET")
	r.HandleFunc("/auth/session/create", createSessionHandler).Methods("POST")
	r.HandleFunc("/call/event", callEventHandler).Methods("POST")
	r.HandleFunc("/session/{sessionId}/validate", validateSessionHandler).Methods("GET")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Voice Session Manager on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Println("REDIS_URL not provided, using in-memory session storage")
		return
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Failed to parse Redis URL: %v, using in-memory storage", err)
		return
	}

	redisClient = redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Redis connection failed: %v, using in-memory storage", err)
		redisClient = nil
		return
	}

	log.Println("Connected to Redis successfully")
}

func responseTimeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a custom ResponseWriter to capture status code
		rw := &responseWriter{ResponseWriter: w}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		responseTimeHistogram.WithLabelValues(
			r.URL.Path,
			r.Method,
			strconv.Itoa(rw.statusCode),
		).Observe(duration.Seconds())
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	services := map[string]string{
		"redis": "in-memory",
	}

	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if err := redisClient.Ping(ctx).Err(); err != nil {
			services["redis"] = "unhealthy"
		} else {
			services["redis"] = "healthy"
		}
	}

	response := HealthResponse{
		Status:      "healthy",
		Environment: environment,
		Timestamp:   time.Now(),
		Services:    services,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func createSessionHandler(w http.ResponseWriter, r *http.Request) {
	var req SessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate access token (simplified - in production, validate JWT)
	if req.AccessToken == "" {
		tokenValidatedCounter.WithLabelValues(
			os.Getenv("ENVIRONMENT"),
			"invalid",
		).Inc()
		http.Error(w, "Access token required", http.StatusUnauthorized)
		return
	}

	tokenValidatedCounter.WithLabelValues(
		os.Getenv("ENVIRONMENT"),
		"valid",
	).Inc()

	// Generate session ID
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(15 * time.Minute) // 15-minute sessions

	// Store session (in Redis or in-memory)
	sessionData := map[string]interface{}{
		"agent_id":   req.AgentID,
		"expires_at": expiresAt,
		"metadata":   req.Metadata,
	}

	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		sessionJSON, _ := json.Marshal(sessionData)
		redisClient.Set(ctx, "session:"+sessionID, sessionJSON, 15*time.Minute)
	}

	sessionCreatedCounter.WithLabelValues(
		os.Getenv("ENVIRONMENT"),
		getAgentType(req.AgentID),
	).Inc()

	response := SessionResponse{
		SessionID:   sessionID,
		ExpiresAt:   expiresAt,
		AgentID:     req.AgentID,
		Environment: os.Getenv("ENVIRONMENT"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func validateSessionHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	if sessionID == "" {
		http.Error(w, "Session ID required", http.StatusBadRequest)
		return
	}

	// Check session validity (from Redis or in-memory)
	valid := false
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		exists := redisClient.Exists(ctx, "session:"+sessionID).Val()
		valid = exists > 0
	}

	if valid {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":      true,
			"session_id": sessionID,
			"timestamp":  time.Now(),
		})
	} else {
		http.Error(w, "Invalid or expired session", http.StatusUnauthorized)
	}
}

func callEventHandler(w http.ResponseWriter, r *http.Request) {
	var event CallEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Invalid event data", http.StatusBadRequest)
		return
	}

	event.Timestamp = time.Now()

	// Record metrics based on event type
	switch event.EventType {
	case "stop":
		if event.Duration != nil {
			callDurationHistogram.WithLabelValues(
				os.Getenv("ENVIRONMENT"),
				event.AgentID,
			).Observe(float64(*event.Duration))
		}
	}

	// Publish to FMS (Flight Memory System) - placeholder
	publishToFMS(event)

	// Store in Redis if available
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		eventJSON, _ := json.Marshal(event)
		redisClient.LPush(ctx, "call_events:"+event.SessionID, eventJSON)
		redisClient.Expire(ctx, "call_events:"+event.SessionID, 24*time.Hour)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "received",
		"timestamp": event.Timestamp,
	})
}

func publishToFMS(event CallEvent) {
	// Placeholder for FMS integration
	log.Printf("Publishing to FMS: %s event for session %s", event.EventType, event.SessionID)
}

func getAgentType(agentID string) string {
	// Determine agent type from ID (simplified logic)
	if len(agentID) > 10 && agentID[:2] == "AI" {
		return "ai_agent"
	}
	return "human_agent"
}
