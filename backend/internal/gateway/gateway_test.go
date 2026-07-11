package gateway

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// ── Auth Tests ───────────────────────────────────────────────────────────────

func TestGenerateAndValidateToken(t *testing.T) {
	token, err := GenerateToken("testuser", "Operator")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken: %v", err)
	}
	if claims.UserID != "testuser" {
		t.Errorf("expected userId=testuser, got %s", claims.UserID)
	}
	if claims.Role != "Operator" {
		t.Errorf("expected role=Operator, got %s", claims.Role)
	}
}

func TestValidateToken_Invalid(t *testing.T) {
	_, err := ValidateToken("this.is.not.a.valid.jwt")
	if err == nil {
		t.Fatal("expected error for invalid token, got nil")
	}
}

func TestLoginHandler_Success(t *testing.T) {
	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "beacon2026"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	LoginHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	var resp map[string]interface{}
	_ = json.NewDecoder(rr.Body).Decode(&resp)
	if _, ok := resp["token"]; !ok {
		t.Error("response missing token field")
	}
	if resp["role"] != "Administrator" {
		t.Errorf("expected role=Administrator, got %v", resp["role"])
	}
}

func TestLoginHandler_BadCredentials(t *testing.T) {
	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "wrong"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	LoginHandler(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

// ── Middleware Tests ─────────────────────────────────────────────────────────

func makeTokenHeader(role string) string {
	tok, _ := GenerateToken("user1", role)
	return "Bearer " + tok
}

func TestJWTAuth_ValidToken(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := JWTAuth(next)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", makeTokenHeader("Analyst"))
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	if !called {
		t.Error("next handler was not called with valid token")
	}
}

func TestJWTAuth_MissingToken(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
	handler := JWTAuth(next)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if called {
		t.Error("next handler should not be called without token")
	}
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestRequireRole_Sufficient(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})
	handler := Chain(next, JWTAuth, RequireRole("Operator"))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", makeTokenHeader("Administrator"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if !called {
		t.Error("Administrator should satisfy Operator requirement")
	}
}

func TestRequireRole_Insufficient(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
	handler := Chain(next, JWTAuth, RequireRole("Administrator"))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", makeTokenHeader("Analyst"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if called {
		t.Error("Analyst should not satisfy Administrator requirement")
	}
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

// ── Config Store Tests ───────────────────────────────────────────────────────

func TestConfigStore_DefaultValues(t *testing.T) {
	store := NewConfigStore()
	v := store.GetFloat64("loitering_threshold_seconds", 0)
	if v != 1800.0 {
		t.Errorf("expected loitering_threshold_seconds=1800, got %v", v)
	}
}

func TestConfigStore_SetAndGet(t *testing.T) {
	store := NewConfigStore()
	store.Set("max_speed_knots", 30.0)
	v := store.GetFloat64("max_speed_knots", 0)
	if v != 30.0 {
		t.Errorf("expected 30, got %v", v)
	}
}

func TestConfigHandler_UpdateAndGet(t *testing.T) {
	store := NewConfigStore()
	h := NewConfigHandler(store)

	// PUT
	body, _ := json.Marshal(map[string]interface{}{"value": 600.0})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/config/loitering_threshold_seconds", bytes.NewReader(body))
	req.SetPathValue("key", "loitering_threshold_seconds")
	rr := httptest.NewRecorder()
	h.UpdateConfig(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("PUT config: expected 200, got %d", rr.Code)
	}

	// Verify store updated
	if store.GetFloat64("loitering_threshold_seconds", 0) != 600.0 {
		t.Error("config store not updated after PUT")
	}
}

// ── Latency Tracker Tests ────────────────────────────────────────────────────

func TestLatencyTracker_Quantiles(t *testing.T) {
	tracker := NewLatencyTracker(1000)

	// Record 100 samples: 10µs each, plus one spike at 500µs
	for i := 0; i < 99; i++ {
		tracker.Record(10 * time.Microsecond)
	}
	tracker.Record(500 * time.Microsecond)

	p50, p99, maxUs := tracker.Quantiles()
	if p50 < 9 || p50 > 15 {
		t.Errorf("p50 expected ~10µs, got %.2f", p50)
	}
	if maxUs < 490 {
		t.Errorf("max expected ~500µs, got %.2f", maxUs)
	}
	_ = p99
}

func TestLatencyTracker_Empty(t *testing.T) {
	tracker := NewLatencyTracker(100)
	p50, p99, maxUs := tracker.Quantiles()
	if p50 != 0 || p99 != 0 || maxUs != 0 {
		t.Errorf("empty tracker should return zeros, got %v %v %v", p50, p99, maxUs)
	}
}
