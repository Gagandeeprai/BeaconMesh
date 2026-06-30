package infrastructure

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/beaconmesh/backend/internal/weather/domain"
)

type counterProvider struct {
	calls  int32
	report *domain.WeatherReport
	err    error
}

func (p *counterProvider) FetchWeatherReport(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	atomic.AddInt32(&p.calls, 1)
	return p.report, p.err
}

func TestWeatherCache_BlockingFirstFetch(t *testing.T) {
	report := &domain.WeatherReport{Location: "Test"}
	cp := &counterProvider{report: report}
	cache := NewWeatherCache(cp, 100*time.Millisecond, nil)

	res, err := cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res != report {
		t.Error("expected matching report")
	}
	if atomic.LoadInt32(&cp.calls) != 1 {
		t.Errorf("expected 1 call, got %d", cp.calls)
	}
}

func TestWeatherCache_ServingFromCache(t *testing.T) {
	report := &domain.WeatherReport{Location: "Test"}
	cp := &counterProvider{report: report}
	cache := NewWeatherCache(cp, 1*time.Hour, nil)

	// Fetch 1
	_, _ = cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	// Fetch 2 (should hit cache)
	res, err := cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res != report {
		t.Error("expected matching report")
	}
	if atomic.LoadInt32(&cp.calls) != 1 {
		t.Errorf("expected only 1 call to provider due to caching, got %d", cp.calls)
	}
}

func TestWeatherCache_StaleWhileRevalidate(t *testing.T) {
	report1 := &domain.WeatherReport{Location: "Initial"}
	report2 := &domain.WeatherReport{Location: "Updated"}
	
	cp := &counterProvider{report: report1}
	
	var updateCalled int32
	var wg sync.WaitGroup
	wg.Add(1)

	cache := NewWeatherCache(cp, 10*time.Millisecond, func(r *domain.WeatherReport) {
		atomic.AddInt32(&updateCalled, 1)
		wg.Done()
	})

	// 1. First fetch (blocking)
	res1, _ := cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	if res1.Location != "Initial" {
		t.Errorf("expected Initial, got %s", res1.Location)
	}

	// Wait for TTL to expire
	time.Sleep(15 * time.Millisecond)
	
	// Update provider to return report2
	cp.report = report2

	// Reset counter and add to WaitGroup to track background revalidation
	atomic.StoreInt32(&updateCalled, 0)
	wg.Add(1)

	// 2. Second fetch (stale-while-revalidate)
	// This should return report1 immediately, and spin off a background worker to fetch report2
	res2, _ := cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	if res2.Location != "Initial" {
		t.Errorf("expected stale report 'Initial' to be returned immediately, got %s", res2.Location)
	}

	// Wait for background worker callback to complete
	wg.Wait()

	if atomic.LoadInt32(&updateCalled) != 1 {
		t.Errorf("expected update callback to be called once, got %d", updateCalled)
	}

	// 3. Third fetch (should hit updated cache)
	res3, _ := cache.FetchWeatherReport(context.Background(), 1.0, 2.0)
	if res3.Location != "Updated" {
		t.Errorf("expected updated report 'Updated' to be cached, got %s", res3.Location)
	}
}
