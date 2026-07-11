package gateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// jwtSecret is loaded from env or falls back to a dev default.
var jwtSecret = func() []byte {
	if s := os.Getenv("BEACON_JWT_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte("beacon-mesh-dev-secret-2026")
}()

// demoCredential holds a demo user's credentials and role.
type demoCredential struct {
	Password string
	Role     string
}

// DemoCredentials maps username → credential for hackathon auth.
// In production this would be replaced with a DB lookup.
var DemoCredentials = map[string]demoCredential{
	"admin":    {Password: "beacon2026", Role: "Administrator"},
	"operator": {Password: "beacon2026", Role: "Operator"},
	"analyst":  {Password: "beacon2026", Role: "Analyst"},
}

// Claims are the JWT payload fields.
type Claims struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken signs a new JWT token for the given user and role.
func GenerateToken(userID, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "beaconmesh",
			Subject:   userID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken parses and validates a JWT token string, returning its Claims.
func ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}

// LoginHandler handles POST /api/v1/auth/login.
// Validates username/password against demo credentials and returns a signed JWT.
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	cred, ok := DemoCredentials[req.Username]
	if !ok || cred.Password != req.Password {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
		return
	}

	token, err := GenerateToken(req.Username, cred.Role)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate token"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"token":    token,
		"role":     cred.Role,
		"userId":   req.Username,
		"expiresIn": 86400,
	})
}
