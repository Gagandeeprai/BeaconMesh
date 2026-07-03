package application

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/beaconmesh/backend/internal/ais/domain"
)

type HealthTracker struct {
	mu           sync.RWMutex
	providerName string
	online       bool
	lastSuccess  time.Time
	lastError    time.Time
	errorMessage string
}

func newHealthTracker(providerName string) *HealthTracker {
	return &HealthTracker{
		providerName: providerName,
		online:       true,
	}
}

func (h *HealthTracker) recordSuccess() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.online = true
	h.lastSuccess = time.Now()
	h.errorMessage = ""
}

func (h *HealthTracker) recordError(err error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.online = false
	h.lastError = time.Now()
	h.errorMessage = err.Error()
}

func (h *HealthTracker) snapshot() HealthSnapshot {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return HealthSnapshot{
		ProviderName: h.providerName,
		Online:       h.online,
		LastSuccess:  h.lastSuccess,
		LastError:    h.lastError,
		ErrorMessage: h.errorMessage,
	}
}

type HealthSnapshot struct {
	ProviderName string    `json:"providerName"`
	Online       bool      `json:"online"`
	LastSuccess  time.Time `json:"lastSuccess"`
	LastError    time.Time `json:"lastError"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	CacheAge     string    `json:"cacheAge"`
}

type Config struct {
	CacheTTL        time.Duration
	RefreshInterval time.Duration
	FallbackToMock  bool
}

type Service struct {
	primary    domain.Provider
	fallback   domain.Provider
	cache      *Cache
	health     *HealthTracker
	cfg        Config

	mu         sync.Mutex
	refreshing bool
}

func NewService(primary domain.Provider, fallback domain.Provider, cfg Config) *Service {
	return &Service{
		primary:  primary,
		fallback: fallback,
		cache:    NewCache(cfg.CacheTTL),
		health:   newHealthTracker(primary.Name()),
		cfg:      cfg,
	}
}

func (s *Service) GetVessels(ctx context.Context) ([]domain.Vessel, error) {
	if vessels, ok := s.cache.Get(); ok && s.cache.IsFresh() {
		return vessels, nil
	}

	vessels, err := s.primary.FetchVessels(ctx)
	if err == nil {
		s.cache.Set(vessels)
		s.health.recordSuccess()
		return vessels, nil
	}

	log.Printf("ais: primary provider %q failed: %v", s.primary.Name(), err)
	s.health.recordError(err)

	if s.fallback != nil {
		log.Printf("ais: trying fallback provider %q", s.fallback.Name())
		vessels, fallbackErr := s.fallback.FetchVessels(ctx)
		if fallbackErr == nil {
			s.cache.Set(vessels)
			s.health.recordSuccess()
			return vessels, nil
		}
		log.Printf("ais: fallback provider also failed: %v", fallbackErr)
	}

	if vessels, ok := s.cache.Get(); ok {
		log.Printf("ais: returning stale cache (age: %v)", s.cache.Age())
		return vessels, nil
	}

	return nil, err
}

func (s *Service) Health() HealthSnapshot {
	hs := s.health.snapshot()
	hs.CacheAge = s.cache.Age().Round(time.Second).String()
	return hs
}

func (s *Service) StartBackgroundRefresh(ctx context.Context) {
	if s.cfg.RefreshInterval <= 0 {
		return
	}
	go func() {
		ticker := time.NewTicker(s.cfg.RefreshInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.refresh(ctx)
			}
		}
	}()
}

func (s *Service) refresh(ctx context.Context) {
	s.mu.Lock()
	if s.refreshing {
		s.mu.Unlock()
		return
	}
	s.refreshing = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.refreshing = false
		s.mu.Unlock()
	}()

	bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	vessels, err := s.primary.FetchVessels(bgCtx)
	if err == nil {
		s.cache.Set(vessels)
		s.health.recordSuccess()
		return
	}

	log.Printf("ais: background refresh failed: %v", err)
	s.health.recordError(err)

	if s.fallback != nil {
		vessels, fallbackErr := s.fallback.FetchVessels(bgCtx)
		if fallbackErr == nil {
			s.cache.Set(vessels)
			return
		}
	}
}
