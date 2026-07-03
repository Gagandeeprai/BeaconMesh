package application

import (
	"sync"
	"time"

	"github.com/beaconmesh/backend/internal/ais/domain"
)

type Cache struct {
	mu       sync.RWMutex
	vessels  []domain.Vessel
	fetchedAt time.Time
	ttl      time.Duration
}

func NewCache(ttl time.Duration) *Cache {
	return &Cache{ttl: ttl}
}

func (c *Cache) Get() ([]domain.Vessel, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.vessels == nil {
		return nil, false
	}
	return c.vessels, true
}

func (c *Cache) Set(vessels []domain.Vessel) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.vessels = vessels
	c.fetchedAt = time.Now()
}

func (c *Cache) IsFresh() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.vessels == nil {
		return false
	}
	return time.Since(c.fetchedAt) < c.ttl
}

func (c *Cache) Age() time.Duration {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.vessels == nil {
		return 0
	}
	return time.Since(c.fetchedAt)
}
