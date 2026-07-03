package infrastructure

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/beaconmesh/backend/internal/weather/domain"
)

type WeatherCache struct {
	provider   domain.WeatherProvider
	ttl        time.Duration
	onUpdate   func(*domain.WeatherReport)
	
	mu         sync.RWMutex
	cache      *domain.WeatherReport
	cachedAt   time.Time
	isFetching bool
}

func NewWeatherCache(provider domain.WeatherProvider, ttl time.Duration, onUpdate func(*domain.WeatherReport)) *WeatherCache {
	return &WeatherCache{
		provider: provider,
		ttl:      ttl,
		onUpdate: onUpdate,
	}
}

// FetchWeatherReport implements domain.WeatherProvider with Stale-While-Revalidate caching
func (c *WeatherCache) FetchWeatherReport(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	c.mu.RLock()
	hasCache := c.cache != nil
	age := time.Since(c.cachedAt)
	report := c.cache
	c.mu.RUnlock()

	// 1. Return fresh cache if within TTL
	if hasCache && age < c.ttl {
		return report, nil
	}

	// 2. Cold start - blocking fetch
	if !hasCache {
		return c.fetchAndStore(ctx, lat, lon)
	}

	// 3. Stale cache - serve immediately, trigger async revalidation
	c.mu.Lock()
	if !c.isFetching {
		c.isFetching = true
		go func() {
			defer func() {
				if rec := recover(); rec != nil {
					log.Printf("[WeatherCache] panic in background revalidation: %v", rec)
				}
				c.mu.Lock()
				c.isFetching = false
				c.mu.Unlock()
			}()

			bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			_, _ = c.fetchAndStore(bgCtx, lat, lon)
		}()
	}
	c.mu.Unlock()

	return report, nil
}

func (c *WeatherCache) fetchAndStore(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	report, err := c.provider.FetchWeatherReport(ctx, lat, lon)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	c.cache = report
	c.cachedAt = time.Now()
	c.mu.Unlock()

	if c.onUpdate != nil {
		c.onUpdate(report)
	}

	return report, nil
}

// Clear invalidates the cache (mainly used for testing)
func (c *WeatherCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = nil
	c.cachedAt = time.Time{}
}
