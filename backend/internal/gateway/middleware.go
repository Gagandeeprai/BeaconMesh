package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// contextKey is an unexported type for context values in this package.
type contextKey string

// ClaimsKey is the context key under which JWT claims are stored.
const ClaimsKey contextKey = "gateway.claims"

// ── Rate Limiting ────────────────────────────────────────────────────────────

const rateLimit = 200 // max requests per IP per minute

type rateBucket struct {
	count  int64
	window int64 // minute epoch (unix_sec / 60)
}

var (
	rateMu  sync.Mutex
	rateMap = make(map[string]*rateBucket)
)

func getOrCreateBucket(ip string) *rateBucket {
	rateMu.Lock()
	defer rateMu.Unlock()
	if b, ok := rateMap[ip]; ok {
		return b
	}
	b := &rateBucket{}
	rateMap[ip] = b
	return b
}

// RateLimit is a per-IP token-bucket middleware (200 req/min default).
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			ip = strings.SplitN(fwd, ",", 2)[0]
		}

		b := getOrCreateBucket(ip)
		currentWindow := time.Now().Unix() / 60

		// Reset counter when we enter a new 1-minute window.
		if atomic.LoadInt64(&b.window) != currentWindow {
			atomic.StoreInt64(&b.window, currentWindow)
			atomic.StoreInt64(&b.count, 0)
		}

		if atomic.AddInt64(&b.count, 1) > rateLimit {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded — 200 req/min"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ── JWT Auth Middleware ──────────────────────────────────────────────────────

// JWTAuth validates the Bearer token in Authorization header and injects Claims
// into the request context. Returns 401 on missing/invalid token.
func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing Authorization: Bearer <token> header"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ValidateToken(tokenStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid or expired token"})
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ── RBAC Middleware ──────────────────────────────────────────────────────────

// roleLevel maps role names to ascending numeric privilege levels.
var roleLevel = map[string]int{
	"Analyst":       1,
	"Operator":      2,
	"Administrator": 3,
}

// RequireRole returns a middleware that enforces a minimum RBAC level.
// Roles in ascending order: Analyst < Operator < Administrator.
func RequireRole(minRole string) func(http.Handler) http.Handler {
	minLevel := roleLevel[minRole]
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(ClaimsKey).(*Claims)
			if !ok || claims == nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
				return
			}
			if roleLevel[claims.Role] < minLevel {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error":    "insufficient permissions",
					"required": minRole,
					"current":  claims.Role,
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ── Proxy Header Middleware ──────────────────────────────────────────────────

// ProxyHeaders injects standard gateway headers into every request.
func ProxyHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Forward real IP
		if ip := r.Header.Get("X-Forwarded-For"); ip == "" {
			r.Header.Set("X-Forwarded-For", r.RemoteAddr)
		}
		w.Header().Set("X-Gateway", "BeaconMesh-v2")
		next.ServeHTTP(w, r)
	})
}

// ── Middleware Chaining Helper ───────────────────────────────────────────────

// Chain composes multiple middleware functions around a handler.
// They execute in the order they are listed (first = outermost).
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

// HandlerFunc is a convenience wrapper to chain around an http.HandlerFunc.
func HandlerFunc(fn http.HandlerFunc, middlewares ...func(http.Handler) http.Handler) http.Handler {
	return Chain(fn, middlewares...)
}
